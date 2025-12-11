import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewForm } from '@/components/ReviewForm';
import { AddVenueForm } from '@/components/AddVenueForm';
import { LoginModal } from '@/components/LoginModal';

// Mock dependencies
vi.mock('@/lib/services/reviewService', () => ({
  createReview: vi.fn(),
  updateReview: vi.fn(),
  deleteReview: vi.fn(),
}));

vi.mock('@/lib/services/venueService', () => ({
  createVenue: vi.fn(),
}));

vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: vi.fn(() => ({ user: null, loading: false })),
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: vi.fn(() => ({ profile: null, loading: false })),
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
  },
}));

import { createReview, updateReview, deleteReview } from '@/lib/services/reviewService';
import { createVenue } from '@/lib/services/venueService';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useProfile } from '@/hooks/useProfile';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// Mock scrollIntoView
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: vi.fn(),
  writable: true,
});

describe('Form Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to default behavior
    (useCurrentUser as any).mockReturnValue({ user: null, loading: false });
    (useProfile as any).mockReturnValue({ profile: null, loading: false });
  });

  describe('ReviewForm', () => {
    const mockOnSubmitted = vi.fn();
    const defaultProps = {
      venueId: 'venue-123',
      currentUserId: 'user-123',
      existingReview: null,
      onSubmitted: mockOnSubmitted,
    };

    it('renders create form when no existing review', () => {
      render(<ReviewForm {...defaultProps} />);

      expect(screen.getByText('Leave a report card')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit review/i })).toBeInTheDocument();
    });

    it('renders update form when existing review is provided', () => {
      const existingReview = {
        id: 'review-123',
        reviewer: 'Test Reviewer',
        comment: 'Test comment',
        score: 8,
        sound_score: 8,
        vibe_score: 7,
        staff_score: 9,
        layout_score: 8,
        created_at: '2024-01-01T00:00:00Z',
        reviewer_name: null,
        user_id: 'user-123',
        reviewer_role: null,
      };

      render(<ReviewForm {...defaultProps} existingReview={existingReview} />);

      expect(screen.getByText('Update your report card')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /update report card/i })).toBeInTheDocument();
    });

    it('pre-fills form fields from existing review', async () => {
      const existingReview = {
        id: 'review-123',
        reviewer: 'Test Reviewer',
        comment: 'Test comment',
        score: 8,
        sound_score: 8,
        vibe_score: 7,
        staff_score: 9,
        layout_score: 8,
        created_at: '2024-01-01T00:00:00Z',
        reviewer_name: null,
        user_id: 'user-123',
        reviewer_role: null,
      };

      render(<ReviewForm {...defaultProps} existingReview={existingReview} />);

      // Wait for useEffect with setTimeout to run
      await waitFor(() => {
        const reviewerInput = screen.getByPlaceholderText('Anonymous') as HTMLInputElement;
        const commentInput = screen.getByPlaceholderText(/best and worst parts/i) as HTMLTextAreaElement;
        expect(reviewerInput.value).toBe('Test Reviewer');
        expect(commentInput.value).toBe('Test comment');
      });
    });

    it('creates review when form is submitted', async () => {
      const user = userEvent.setup();
      (createReview as any).mockResolvedValue({ data: { id: 'new-review' }, error: null });

      render(<ReviewForm {...defaultProps} />);

      const form = document.querySelector('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(createReview).toHaveBeenCalled();
      });

      expect(mockOnSubmitted).toHaveBeenCalled();
    });

    it('updates review when form is submitted with existing review', async () => {
      const existingReview = {
        id: 'review-123',
        reviewer: 'Test Reviewer',
        comment: 'Test comment',
        score: 8,
        sound_score: 8,
        vibe_score: 7,
        staff_score: 9,
        layout_score: 8,
        created_at: '2024-01-01T00:00:00Z',
        reviewer_name: null,
        user_id: 'user-123',
        reviewer_role: null,
      };

      (updateReview as any).mockResolvedValue({ data: { id: 'review-123' }, error: null });

      render(<ReviewForm {...defaultProps} existingReview={existingReview} />);

      const form = document.querySelector('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(updateReview).toHaveBeenCalled();
      });

      expect(mockOnSubmitted).toHaveBeenCalled();
    });

    it('shows error when currentUserId is null', async () => {
      render(<ReviewForm {...defaultProps} currentUserId={null} />);

      const form = document.querySelector('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        // Error is displayed in a paragraph with class "form-error"
        const errorElement = screen.queryByText(/unable to start a session/i) ||
                            document.querySelector('.form-error');
        expect(errorElement).toBeTruthy();
      }, { timeout: 3000 });

      expect(createReview).not.toHaveBeenCalled();
    });

    it('uses profile role for logged-in users', async () => {
      (useCurrentUser as any).mockReturnValue({
        user: { id: 'user-123', email: 'test@example.com' },
        loading: false,
      });
      (useProfile as any).mockReturnValue({
        profile: { id: 'user-123', role: 'artist', display_name: 'Test User' },
        loading: false,
      });

      (createReview as any).mockResolvedValue({ data: { id: 'new-review' }, error: null });

      render(<ReviewForm {...defaultProps} />);

      const form = document.querySelector('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(createReview).toHaveBeenCalled();
        const callArgs = (createReview as any).mock.calls[0][0];
        expect(callArgs.reviewer_role).toBe('artist');
      });
    });
  });

  describe('AddVenueForm', () => {
    const mockOnAdded = vi.fn();

    it('renders add venue button initially', () => {
      render(<AddVenueForm onAdded={mockOnAdded} />);

      // The button text uses a special apostrophe character
      expect(screen.getByText(/can.*t find your venue/i)).toBeInTheDocument();
    });

    it('shows form when button is clicked', async () => {
      const user = userEvent.setup();
      render(<AddVenueForm onAdded={mockOnAdded} />);

      const addButton = screen.getByText(/can.*t find your venue/i).closest('button');
      if (!addButton) throw new Error('Add button not found');
      await user.click(addButton);

      // Wait for form to appear and check for inputs using placeholders
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Bad Bird Bar')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Miami')).toBeInTheDocument();
      });
    });

    it('creates venue when form is submitted with valid data', async () => {
      const user = userEvent.setup();
      (createVenue as any).mockResolvedValue({
        data: { id: 'new-venue-id' },
        error: null,
      });


      render(<AddVenueForm onAdded={mockOnAdded} />);

      // Open form - find button by text content
      const buttons = screen.getAllByRole('button');
      const addButton = buttons.find(btn => btn.textContent?.match(/can.*t find your venue/i));
      if (!addButton) throw new Error('Add button not found');
      await user.click(addButton);

      // Fill form using placeholders
      await user.type(screen.getByPlaceholderText('Bad Bird Bar'), 'Test Venue');
      await user.type(screen.getByPlaceholderText('Miami'), 'Test City');

      // Submit
      const submitButton = screen.getByRole('button', { name: /add venue/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(createVenue).toHaveBeenCalledWith({
          name: 'Test Venue',
          city: 'Test City',
          country: 'USA',
          address: null,
          photo_url: null,
          google_place_id: undefined,
        });
      });

      expect(mockPush).toHaveBeenCalledWith('/venues/new-venue-id');
    });

    it('shows error when name or city is missing', async () => {
      const user = userEvent.setup();
      render(<AddVenueForm onAdded={mockOnAdded} />);

      // Open form - find button by text content
      const buttons = screen.getAllByRole('button');
      const addButton = buttons.find(btn => btn.textContent?.match(/can.*t find your venue/i));
      if (!addButton) throw new Error('Add button not found');
      await user.click(addButton);

      // Wait for form to appear
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Bad Bird Bar')).toBeInTheDocument();
      });

      // Submit without filling required fields - use form submission
      const form = document.querySelector('form');
      if (!form) throw new Error('Form not found');
      fireEvent.submit(form);

      await waitFor(() => {
        // Error message is "Name and city are required." (with period)
        // The error is displayed in a <p> tag with inline styles
        const errorParagraphs = Array.from(document.querySelectorAll('p'));
        const errorFound = errorParagraphs.some(p => 
          p.textContent?.match(/name and city are required\.?/i)
        );
        expect(errorFound).toBe(true);
      }, { timeout: 3000 });

      expect(createVenue).not.toHaveBeenCalled();
    });

    it('pre-fills form from draftVenue prop', async () => {
      const draftVenue = {
        name: 'Draft Venue',
        city: 'Draft City',
        country: 'Canada',
        address: '123 Main St',
      };

      render(<AddVenueForm onAdded={mockOnAdded} draftVenue={draftVenue} />);

      // Wait for form to appear (draftVenue triggers form display)
      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText('Bad Bird Bar') as HTMLInputElement;
        const cityInput = screen.getByPlaceholderText('Miami') as HTMLInputElement;
        
        expect(nameInput.value).toBe('Draft Venue');
        expect(cityInput.value).toBe('Draft City');
      });
    });
  });

  describe('LoginModal', () => {
    const mockOnClose = vi.fn();

    it('does not render when isOpen is false', () => {
      const { container } = render(<LoginModal isOpen={false} onClose={mockOnClose} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders sign in form when isOpen is true', () => {
      render(<LoginModal isOpen={true} onClose={mockOnClose} />);

      // Check for form elements (avoiding multiple "sign in" text matches)
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      const submitButtons = screen.getAllByRole('button');
      const submitButton = submitButtons.find(btn => btn.getAttribute('type') === 'submit');
      expect(submitButton).toHaveTextContent(/sign in/i);
    });

    it('switches between sign in and sign up', async () => {
      const user = userEvent.setup();
      render(<LoginModal isOpen={true} onClose={mockOnClose} />);

      const submitButtons = screen.getAllByRole('button');
      const submitButton = submitButtons.find(btn => btn.getAttribute('type') === 'submit');
      expect(submitButton).toHaveTextContent(/sign in/i);

      const switchButton = screen.getByText(/don't have an account/i);
      await user.click(switchButton);

      const submitButtonsAfter = screen.getAllByRole('button');
      const submitButtonAfter = submitButtonsAfter.find(btn => btn.getAttribute('type') === 'submit');
      expect(submitButtonAfter).toHaveTextContent(/sign up/i);
    });

    it('validates email is required', async () => {
      const user = userEvent.setup();
      render(<LoginModal isOpen={true} onClose={mockOnClose} />);

      const form = document.querySelector('form');
      if (!form) throw new Error('Form not found');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('validates password length for sign up', async () => {
      const user = userEvent.setup();
      render(<LoginModal isOpen={true} onClose={mockOnClose} />);

      // Switch to sign up
      const switchButton = screen.getByText(/don't have an account/i);
      await user.click(switchButton);

      // Fill email but short password
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), '12345');

      const form = document.querySelector('form');
      if (!form) throw new Error('Form not found');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('calls signInWithPassword for sign in', async () => {
      const user = userEvent.setup();
      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      render(<LoginModal isOpen={true} onClose={mockOnClose} />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');

      const form = document.querySelector('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('calls signUp for sign up', async () => {
      const user = userEvent.setup();
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      render(<LoginModal isOpen={true} onClose={mockOnClose} />);

      // Switch to sign up
      const switchButton = screen.getByText(/don't have an account/i);
      await user.click(switchButton);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');

      const form = document.querySelector('form');
      if (!form) throw new Error('Form not found');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(supabase.auth.signUp).toHaveBeenCalled();
      });
    });

    it('handles Google sign in', async () => {
      const user = userEvent.setup();
      (supabase.auth.signInWithOAuth as any).mockResolvedValue({ error: null });

      render(<LoginModal isOpen={true} onClose={mockOnClose} />);

      const googleButton = screen.getByRole('button', { name: /sign in with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: {
            redirectTo: expect.stringContaining('/auth/callback'),
          },
        });
      });
    });
  });
});
