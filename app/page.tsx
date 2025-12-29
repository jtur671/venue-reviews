'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { VenueFilters } from '@/components/VenueFilters';
import { AddVenueForm } from '@/components/AddVenueForm';
import { VenueList } from '@/components/VenueList';
import { RemoteSearchResults } from '@/components/RemoteSearchResults';
import { RecentlyRatedSection } from '@/components/RecentlyRatedSection';
import { DraftVenue, RemoteVenue } from '@/types/venues';
import { useVenues } from '@/hooks/useVenues';
import { useVenueStats } from '@/hooks/useVenueStats';
import { useRemoteSearch } from '@/hooks/useRemoteSearch';
import { createVenue } from '@/lib/services/venueService';
import { scoreToGrade } from '@/lib/utils/grades';
import { venuesCache } from '@/lib/cache/venuesCache';

type SortBy = 'top-rated' | 'most-reviewed' | 'name';

export default function HomePage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [sortBy, setSortBy] = useState<SortBy>('top-rated');
  const [draftVenue, setDraftVenue] = useState<DraftVenue>(null);
  const [creatingVenue, setCreatingVenue] = useState(false);
  const addVenueRef = useRef<HTMLDivElement | null>(null);

  const { venues, loading, error: venuesError, refetch: loadVenues } = useVenues();
  const { popularCityStats, popularCities, recentlyRated, existingVenueLookup } = useVenueStats(venues);
  const { remoteResults, remoteLoading, remoteError, hasQuery } = useRemoteSearch(search, selectedCity);
  
  // Auto-backfill photos for venues with google_place_id but no photo_url
  useEffect(() => {
    if (!venues || venues.length === 0) return;
    
    // Find venues that need photos
    const venuesNeedingPhotos = venues.filter(
      v => v.google_place_id && !v.photo_url
    );
    
    if (venuesNeedingPhotos.length === 0) return;
    
    // Backfill photos for up to 3 venues at a time (to avoid rate limits)
    const venuesToBackfill = venuesNeedingPhotos.slice(0, 3);
    
    venuesToBackfill.forEach((venue) => {
      fetch('/api/backfill-venue-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueId: venue.id }),
      }).catch((err) => {
        console.warn(`Background photo backfill failed for ${venue.name}:`, err);
      });
    });
  }, [venues]);

  const filteredVenues = useMemo(() => {
    let list = venues;

    if (selectedCity !== 'All') {
      list = list.filter((v) => v.city === selectedCity);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const searchWords = q.split(/\s+/).filter(w => w.length > 0);
      
      // Venue keywords that indicate this is a venue name search, not a city
      const venueKeywords = ['ballroom', 'hall', 'club', 'theater', 'theatre', 'venue', 'bar', 'lounge', 'tavern', 'pub', 'center', 'centre', 'music'];
      const hasVenueKeywords = venueKeywords.some(keyword => q.includes(keyword));
      
      // Multi-word searches without venue keywords are likely city searches
      const isLikelyCitySearch = searchWords.length >= 2 && !hasVenueKeywords;
      
      if (isLikelyCitySearch) {
        // For city searches, show all venues where the city name contains all search words
        list = list.filter((v) => {
          const cityLower = v.city.toLowerCase();
          // Check if all search words are in the city name
          return searchWords.every(word => cityLower.includes(word));
        });
      } else {
        // For venue name searches, check name or city
        list = list.filter(
          (v) =>
            v.name.toLowerCase().includes(q) ||
            v.city.toLowerCase().includes(q)
        );
      }
    }

    // sort
    const sorted = [...list].sort((a, b) => {
      if (sortBy === 'top-rated') {
        const aScore = a.avgScore ?? 0;
        const bScore = b.avgScore ?? 0;
        if (bScore !== aScore) return bScore - aScore;
        // tie-breaker: more reviews wins
        return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
      }

      if (sortBy === 'most-reviewed') {
        const aCount = a.reviewCount ?? 0;
        const bCount = b.reviewCount ?? 0;
        if (bCount !== aCount) return bCount - aCount;
        // tie-breaker: better score wins
        const aScore = a.avgScore ?? 0;
        const bScore = b.avgScore ?? 0;
        return bScore - aScore;
      }

      // 'name' A–Z
      return a.name.localeCompare(b.name);
    });

    return sorted;
  }, [search, venues, selectedCity, sortBy]);

  const resultLabel = useMemo(() => {
    if (!hasQuery) return undefined;

    if (selectedCity !== 'All' && search.trim()) {
      return `in ${selectedCity} matching "${search.trim()}"`;
    }

    if (selectedCity !== 'All') {
      return `in ${selectedCity}`;
    }

    if (search.trim()) {
      return `matching "${search.trim()}"`;
    }

    return undefined;
  }, [hasQuery, selectedCity, search]);

  const communityLabel = useMemo(() => {
    if (!hasQuery) return undefined;
    if (resultLabel) return `${resultLabel} (community ratings)`;
    return 'community ratings';
  }, [hasQuery, resultLabel]);

  function handleExampleCity(city: string) {
    setSearch('');
    setSelectedCity(city);
    // Clear any draft venue when selecting a city
    setDraftVenue(null);
  }

  function handleClear() {
    setSearch('');
    setSelectedCity('All');
    setDraftVenue(null);
  }

  async function handleSelectRemoteVenue(v: RemoteVenue) {
    // Immediately create the venue and navigate to its review page
    setCreatingVenue(true);
    
    // Set a safety timeout to reset creating state if something hangs
    let safetyTimeout: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      console.warn('Venue creation taking too long, resetting state');
      setCreatingVenue(false);
    }, 35_000); // 35 seconds
    
    try {
      // Add timeout wrapper to prevent hanging
      const createVenuePromise = createVenue({
        name: v.name,
        city: v.city,
        country: v.country || 'USA',
        address: v.address || null,
        photo_url: v.photoUrl || null,
        google_place_id: v.googlePlaceId || null,
      });

      const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => {
        setTimeout(() => {
          resolve({ data: null, error: { message: 'Venue creation timed out. Please try again.' } });
        }, 30_000); // 30 second timeout
      });

      const { data, error } = await Promise.race([createVenuePromise, timeoutPromise]);

      if (error) {
        console.error('Error creating venue:', error);
        if (safetyTimeout) {
          clearTimeout(safetyTimeout);
          safetyTimeout = null;
        }
        // Fallback to old behavior if creation fails
        setDraftVenue({
          name: v.name,
          city: v.city,
          country: v.country,
          address: v.address,
          photoUrl: v.photoUrl,
          googlePlaceId: v.googlePlaceId,
        });
        addVenueRef.current?.scrollIntoView({ behavior: 'smooth' });
        setCreatingVenue(false);
        return;
      }

      if (data?.id) {
        console.log('Venue created successfully, navigating to:', data.id);
        
        // Invalidate venues cache so the new venue appears when user navigates back
        // This ensures the venue list is fresh after creation
        venuesCache.clear();
        // Force refresh to bypass Next.js edge cache
        setTimeout(() => {
          loadVenues(true);
        }, 300);
        
        // Handle photo caching/backfill:
        // 1. If we have a Google photo URL, cache it to Supabase Storage
        // 2. If we have google_place_id but no photo URL, trigger backfill to fetch it
        if (v.photoUrl?.includes('maps.googleapis.com/maps/api/place/photo')) {
          // Cache the Google photo URL to Supabase Storage
          fetch('/api/cache-venue-photo', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              photoUrl: v.photoUrl,
              venueId: data.id,
            }),
          }).catch((err) => {
            console.warn('Background photo caching failed:', err);
            // Non-blocking - venue is already created
          });
        } else if (v.googlePlaceId && !v.photoUrl) {
          // If we have google_place_id but no photo URL, fetch it from Google Places
          // The service layer also handles this, but this is a backup trigger
          fetch('/api/backfill-venue-photos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ venueId: data.id }),
          }).catch((err) => {
            console.warn('Background photo backfill failed:', err);
            // Non-blocking - venue is already created
          });
        }
        
        // Small delay to ensure database is ready and cache is refreshed, then navigate
        setTimeout(() => {
          try {
            router.push(`/venues/${data.id}`);
          } catch (navErr) {
            console.error('Navigation failed:', navErr);
            setCreatingVenue(false);
          }
        }, 500); // Increased delay to allow cache refresh
        return;
      }
      
      // If we get here, venue creation succeeded but no ID was returned
      console.error('Venue creation succeeded but no ID returned');
      setDraftVenue({
        name: v.name,
        city: v.city,
        country: v.country,
        address: v.address,
        photoUrl: v.photoUrl,
        googlePlaceId: v.googlePlaceId,
      });
      addVenueRef.current?.scrollIntoView({ behavior: 'smooth' });
      setCreatingVenue(false);
    } catch (err) {
      console.error('Unexpected error creating venue:', err);
      if (safetyTimeout) {
        clearTimeout(safetyTimeout);
        safetyTimeout = null;
      }
      // Fallback to draft venue on unexpected errors
      setDraftVenue({
        name: v.name,
        city: v.city,
        country: v.country,
        address: v.address,
        photoUrl: v.photoUrl,
        googlePlaceId: v.googlePlaceId,
      });
      addVenueRef.current?.scrollIntoView({ behavior: 'smooth' });
      setCreatingVenue(false);
    }
  }

  function scrollToSearch() {
    const searchSection = document.getElementById('search-section');
    if (searchSection) {
      searchSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <main className="overflow-x-hidden" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto w-full max-w-6xl px-0">
        {/* Section 1: Hero carousel with venue cards + grades */}
        <section className="snap-start flex flex-col justify-start px-4 pt-8 md:pt-12 pb-8 md:pb-12 overflow-x-hidden w-full max-w-full">
          <div className="mb-4 md:mb-6 w-full">
            <p className="text-xs font-medium tracking-wide uppercase mb-1 md:mb-0.5" style={{ color: '#0ea5e9' }}>
              Live room report cards
            </p>
            <h1 className="text-2xl md:text-4xl font-semibold mb-2 md:mb-1 break-words" style={{ color: 'var(--text-main)' }}>
              Find the right room for your next show.
            </h1>
            <p className="text-sm md:text-base max-w-full md:max-w-2xl mb-3 md:mb-2 break-words" style={{ color: 'var(--text-muted)' }}>
              See real-world grades from artists and fans before you book. Sound,
              vibe, layout, and how the room actually treats you.
            </p>
            {/* Search Now CTA Button */}
            <div className="flex justify-center mb-4 md:mb-6">
              <button
                onClick={scrollToSearch}
                className="inline-flex items-center gap-2 px-5 py-2.5 md:px-8 md:py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold text-sm md:text-lg rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                <span>🔍</span>
                <span>Search Now</span>
                <span>↓</span>
              </button>
            </div>
          </div>

          {/* Carousel - Dynamic top 3 most reviewed venues */}
          <div className="relative">
            <div className="flex gap-4 md:gap-8 overflow-x-auto pb-2 snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-visible md:snap-none">
              {loading ? (
                <div className="col-span-3 text-center py-12">
                  <p className="text-slate-400">Loading venues...</p>
                </div>
              ) : venuesError ? (
                <div className="col-span-3 text-center py-12">
                  <p className="text-slate-400">Couldn&apos;t load venues.</p>
                  <p className="text-slate-500 text-sm" style={{ marginTop: '0.25rem' }}>
                    {venuesError}
                  </p>
                </div>
              ) : (() => {
                // Get the 3 most reviewed venues (dynamic, not hardcoded)
                const topVenues = venues
                  .filter((v) => v.reviewCount > 0)
                  .sort((a, b) => {
                    // Primary sort: most reviews
                    if (b.reviewCount !== a.reviewCount) {
                      return b.reviewCount - a.reviewCount;
                    }
                    // Secondary sort: highest score
                    return (b.avgScore ?? 0) - (a.avgScore ?? 0);
                  })
                  .slice(0, 3);
                
                if (topVenues.length === 0) {
                  return (
                    <div className="col-span-3 text-center py-12">
                      <p className="text-slate-400">No venues with reviews yet. Be the first to rate a venue!</p>
                    </div>
                  );
                }
                
                return topVenues.map((v) => {
                  const grade = scoreToGrade(v.avgScore);
                  const artistGrade = v.artistScore ? scoreToGrade(v.artistScore) : null;
                  const fanGrade = v.fanScore ? scoreToGrade(v.fanScore) : null;
                  const hasBoth = v.artistCount > 0 && v.fanCount > 0;
                  const hasOnlyArtist = v.artistCount > 0 && v.fanCount === 0;
                  const hasOnlyFan = v.fanCount > 0 && v.artistCount === 0;
                  
                  // Use venue photo if available
                  // If no photo but we have google_place_id, trigger backfill in background
                  let imageUrl = v.photo_url || null;
                  
                  // If venue has google_place_id but no photo_url, trigger backfill
                  if (!imageUrl && v.google_place_id) {
                    // Trigger backfill in background (non-blocking)
                    fetch('/api/backfill-venue-photos', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ venueId: v.id }),
                    }).catch((err) => {
                      console.warn(`Background photo backfill failed for ${v.name}:`, err);
                    });
                  }
                  
                  // Generate a unique placeholder based on venue name hash if no photo
                  if (!imageUrl) {
                    const nameHash = v.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                    const placeholderIndex = (nameHash % 5); // 0-4 for different images
                    
                    // Use different Unsplash images for variety - music/venue themed
                    const placeholderImages = [
                      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80', // Performance
                      'https://images.unsplash.com/photo-1512427691650-1e0c2f9a81b3?auto=format&fit=crop&w=1200&q=80', // Venue interior
                      'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=1200&q=80', // Stage/concert
                      'https://images.unsplash.com/photo-1571266028243-3716f01c7b4e?auto=format&fit=crop&w=1200&q=80', // Live music
                      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80', // Concert crowd
                    ];
                    imageUrl = placeholderImages[placeholderIndex] || placeholderImages[0];
                  }
                  
                  return (
                    <Link
                      key={v.id}
                      href={`/venues/${v.id}`}
                      className="relative flex-shrink-0 w-[85vw] max-w-[420px] md:w-auto snap-center rounded-2xl md:rounded-3xl bg-slate-900 text-slate-50 shadow-2xl shadow-slate-900/50 overflow-hidden transform transition-transform hover:scale-[1.02] block"
                    >
                      <div className="relative h-64 md:h-96 bg-slate-800 overflow-hidden">
                        {imageUrl && (
                          <img
                            src={imageUrl}
                            alt={v.name}
                            className="h-full w-full object-cover opacity-80"
                            loading="lazy"
                            onError={(e) => {
                              // If image fails to load, hide it and show gradient background
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.style.background = 'linear-gradient(135deg, #1e293b 0%, #334155 100%)';
                              }
                            }}
                          />
                        )}
                        {!imageUrl && (
                          <div className="h-full w-full bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
                        
                        {/* Rotten Tomatoes Style Grade Display - Top Right */}
                        <div className="absolute top-3 right-3 md:top-5 md:right-5">
                          <div className="flex flex-col items-end gap-2 md:gap-3">
                            {/* Overall Grade - Large and Prominent */}
                            {grade && (
                              <div className="inline-flex items-center justify-center rounded-xl md:rounded-2xl backdrop-blur-sm px-3 py-2 md:px-5 md:py-4 shadow-2xl border-2 border-amber-400/30" style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
                                <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider mr-2 md:mr-3" style={{ color: '#475569' }}>
                                  Overall
                                </span>
                                <span className="text-3xl md:text-6xl font-black text-amber-500 leading-none">
                                  {grade}
                                </span>
                              </div>
                            )}
                            
                            {/* Artist & Fan Scores - Rotten Tomatoes Style Side-by-Side */}
                            {hasBoth && (
                              <div className="flex gap-2 md:gap-3">
                                {/* Artist Score */}
                                <div className="inline-flex flex-col items-center rounded-lg md:rounded-xl backdrop-blur-sm px-2.5 py-1.5 md:px-4 md:py-2 shadow-xl border border-blue-400/40" style={{ background: 'rgba(37, 99, 235, 0.85)' }}>
                                  <span className="text-[9px] md:text-[10px] font-semibold uppercase tracking-wider text-blue-100 mb-0.5">
                                    Artist
                                  </span>
                                  <span className="text-xl md:text-3xl font-black text-white leading-none">
                                    {artistGrade}
                                  </span>
                                  <span className="text-[8px] md:text-[9px] text-blue-200 mt-0.5">
                                    {v.artistCount} {v.artistCount === 1 ? 'review' : 'reviews'}
                                  </span>
                                </div>
                                
                                {/* Fan Score */}
                                <div className="inline-flex flex-col items-center rounded-lg md:rounded-xl backdrop-blur-sm px-2.5 py-1.5 md:px-4 md:py-2 shadow-xl border border-purple-400/40" style={{ background: 'rgba(147, 51, 234, 0.85)' }}>
                                  <span className="text-[9px] md:text-[10px] font-semibold uppercase tracking-wider text-purple-100 mb-0.5">
                                    Fan
                                  </span>
                                  <span className="text-xl md:text-3xl font-black text-white leading-none">
                                    {fanGrade}
                                  </span>
                                  <span className="text-[8px] md:text-[9px] text-purple-200 mt-0.5">
                                    {v.fanCount} {v.fanCount === 1 ? 'review' : 'reviews'}
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            {/* Only Artist Reviews */}
                            {hasOnlyArtist && (
                              <div className="inline-flex flex-col items-center rounded-lg md:rounded-xl backdrop-blur-sm px-2.5 py-1.5 md:px-4 md:py-2 shadow-xl border border-blue-400/40" style={{ background: 'rgba(37, 99, 235, 0.85)' }}>
                                <span className="text-[9px] md:text-[10px] font-semibold uppercase tracking-wider text-blue-100 mb-0.5">
                                  Artist
                                </span>
                                <span className="text-xl md:text-3xl font-black text-white leading-none">
                                  {artistGrade}
                                </span>
                                <span className="text-[8px] md:text-[9px] text-blue-200 mt-0.5">
                                  {v.artistCount} {v.artistCount === 1 ? 'review' : 'reviews'}
                                </span>
                              </div>
                            )}
                            
                            {/* Only Fan Reviews */}
                            {hasOnlyFan && (
                              <div className="inline-flex flex-col items-center rounded-lg md:rounded-xl backdrop-blur-sm px-2.5 py-1.5 md:px-4 md:py-2 shadow-xl border border-purple-400/40" style={{ background: 'rgba(147, 51, 234, 0.85)' }}>
                                <span className="text-[9px] md:text-[10px] font-semibold uppercase tracking-wider text-purple-100 mb-0.5">
                                  Fan
                                </span>
                                <span className="text-xl md:text-3xl font-black text-white leading-none">
                                  {fanGrade}
                                </span>
                                <span className="text-[8px] md:text-[9px] text-purple-200 mt-0.5">
                                  {v.fanCount} {v.fanCount === 1 ? 'review' : 'reviews'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Venue Info - Bottom Left */}
                        <div className="absolute bottom-3 left-3 right-3 md:bottom-5 md:left-5 md:right-5">
                          <h2 className="text-lg md:text-3xl font-bold mb-1 md:mb-2 drop-shadow-lg">{v.name}</h2>
                          <p className="text-sm md:text-lg text-slate-200 font-semibold">{v.city}</p>
                        </div>
                      </div>
                    </Link>
                  );
                });
              })()}
            </div>
        </div>
      </section>

        {/* Section 2: "How it works" narrative */}
        <section className="snap-start min-h-screen md:h-screen flex flex-col justify-start md:justify-center px-4 py-8 md:py-0">
          <div className="w-full max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-6 md:mb-12 text-center w-full">
              <h2 className="text-2xl md:text-4xl font-bold mb-2 md:mb-3 break-words" style={{ color: 'var(--text-main)' }}>
                How it works
              </h2>
              <p className="text-sm md:text-lg max-w-full md:max-w-2xl mx-auto break-words px-2" style={{ color: 'var(--text-muted)' }}>
                Find the right room for your next show in three simple steps.
              </p>
            </div>

            {/* Large Step Cards */}
            <div className="grid gap-4 md:gap-8 grid-cols-1 md:grid-cols-3 mb-6 md:mb-12">
              {/* Step 1 */}
              <div className="group relative rounded-xl md:rounded-2xl border-2 p-5 md:p-8 shadow-lg hover:shadow-2xl hover:border-blue-400 transition-all duration-300 hover:-translate-y-1" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-3 md:mb-4">
                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <span className="text-3xl md:text-5xl font-black text-white">1</span>
                    </div>
                    <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 text-2xl md:text-4xl">🔍</div>
                  </div>
                  <h3 className="text-lg md:text-2xl font-bold mb-1 md:mb-2" style={{ color: 'var(--text-main)' }}>
                    Search a venue
                  </h3>
                  <p className="text-sm md:text-base" style={{ color: 'var(--text-muted)' }}>
                    Find rooms by name or city.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="group relative rounded-xl md:rounded-2xl border-2 p-5 md:p-8 shadow-lg hover:shadow-2xl hover:border-purple-400 transition-all duration-300 hover:-translate-y-1" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-3 md:mb-4">
                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <span className="text-3xl md:text-5xl font-black text-white">2</span>
                    </div>
                    <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 text-2xl md:text-4xl">📊</div>
                  </div>
                  <h3 className="text-lg md:text-2xl font-bold mb-1 md:mb-2" style={{ color: 'var(--text-main)' }}>
                    Read the room
                  </h3>
                  <p className="text-sm md:text-base" style={{ color: 'var(--text-muted)' }}>
                    See scores and notes from artists and fans.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="group relative rounded-xl md:rounded-2xl border-2 p-5 md:p-8 shadow-lg hover:shadow-2xl hover:border-amber-400 transition-all duration-300 hover:-translate-y-1" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-3 md:mb-4">
                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <span className="text-3xl md:text-5xl font-black text-white">3</span>
                    </div>
                    <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 text-2xl md:text-4xl">✍️</div>
                  </div>
                  <h3 className="text-lg md:text-2xl font-bold mb-1 md:mb-2" style={{ color: 'var(--text-main)' }}>
                    Leave your report card
                  </h3>
                  <p className="text-sm md:text-base" style={{ color: 'var(--text-muted)' }}>
                    Drop a new venue or add your take to an existing room.
                  </p>
                </div>
              </div>
            </div>

            {/* What we measure - Larger and more prominent */}
            <div className="rounded-2xl md:rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-slate-50 p-5 md:p-8 shadow-2xl">
              <div className="text-center mb-4 md:mb-6">
                <h3 className="text-xl md:text-3xl font-bold mb-1 md:mb-2">What we measure</h3>
                <p className="text-xs md:text-base text-slate-300">
                  The checklist behind every rating.
                </p>
              </div>
              <div className="grid gap-3 md:gap-6 grid-cols-1 md:grid-cols-2">
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">🎚️</span>
                  <div>
                    <span className="font-bold text-base md:text-lg">Sound:</span>
                    <p className="text-sm md:text-base text-slate-300 mt-1">
                      Clarity, volume, and how mixes translate.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">🎧</span>
                  <div>
                    <span className="font-bold text-base md:text-lg">Vibe:</span>
                    <p className="text-sm md:text-base text-slate-300 mt-1">
                      Crowd energy, staff, and overall feel.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">👀</span>
                  <div>
                    <span className="font-bold text-base md:text-lg">Layout:</span>
                    <p className="text-sm md:text-base text-slate-300 mt-1">
                      Stage, sightlines, green room, and load-in.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">⚖️</span>
                  <div>
                    <span className="font-bold text-base md:text-lg">Fairness:</span>
                    <p className="text-sm md:text-base text-slate-300 mt-1">
                      Payout, merch cuts, and how the room treats artists.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Search section */}
        <section id="search-section" className="snap-start min-h-screen md:h-screen flex flex-col justify-start px-4 py-8 md:py-0 overflow-x-hidden w-full" style={{ scrollSnapStop: 'always' }}>
          <div className="backdrop-blur rounded-3xl border px-6 py-8 md:px-10 md:py-10 shadow-sm w-full max-w-full flex flex-col" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)', opacity: 0.9, maxHeight: '100%', overflow: 'hidden' }}>
            <div className="mb-4 w-full overflow-x-hidden flex-shrink-0">
              <h2 className="text-lg md:text-xl font-semibold break-words" style={{ color: 'var(--text-main)' }}>
                Start with a search
              </h2>
              <p className="mt-1 text-sm break-words" style={{ color: 'var(--text-muted)' }}>
                Type a venue name or city, or pick a popular city to see real-world
                report cards.
              </p>
            </div>

            <div className="flex-shrink-0">
      <VenueFilters
        cities={popularCities}
        selectedCity={selectedCity}
        onCityChange={setSelectedCity}
        search={search}
        onSearchChange={setSearch}
        onClear={handleClear}
        searchDisabled={selectedCity !== 'All'}
      />
            </div>

            <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
              {hasQuery ? (
                <>
                  <div className="sort-controls" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
                    <div className="chip-row" role="group" aria-label="Sort venues">
                      <button
                        type="button"
                        className={`chip ${sortBy === 'top-rated' ? 'chip--active' : ''}`}
                        onClick={() => setSortBy('top-rated')}
                        aria-pressed={sortBy === 'top-rated'}
                      >
                        Top rated
                      </button>
              <button
                type="button"
                        className={`chip ${sortBy === 'most-reviewed' ? 'chip--active' : ''}`}
                        onClick={() => setSortBy('most-reviewed')}
                        aria-pressed={sortBy === 'most-reviewed'}
              >
                        Most reviewed
              </button>
              <button
                type="button"
                        className={`chip ${sortBy === 'name' ? 'chip--active' : ''}`}
                        onClick={() => setSortBy('name')}
                        aria-pressed={sortBy === 'name'}
              >
                        A–Z
              </button>
                    </div>
        </div>
                  <VenueList venues={filteredVenues} loading={loading} label={communityLabel} />
          <RemoteSearchResults
            results={remoteResults}
            loading={remoteLoading}
            error={remoteError}
            hasQuery={hasQuery}
            onSelectVenue={handleSelectRemoteVenue}
            existingVenueLookup={existingVenueLookup}
                creatingVenue={creatingVenue}
              />
        <div ref={addVenueRef}>
          <AddVenueForm onAdded={loadVenues} draftVenue={draftVenue} />
                  </div>
                </>
              ) : (
                <div style={{ marginTop: '1rem' }}>
                  <RecentlyRatedSection venues={recentlyRated} />
        </div>
      )}
    </div>
          </div>
        </section>
      </div>
    </main>
  );
}
