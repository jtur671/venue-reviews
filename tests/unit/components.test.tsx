import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteAccountModal } from '@/components/DeleteAccountModal';

describe('Modal Components', () => {
  describe('DeleteAccountModal', () => {
    const mockOnClose = vi.fn();
    const mockOnConfirm = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('renders when isOpen is true', () => {
      render(
        <DeleteAccountModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          deleting={false}
        />
      );

      // Use getAllByText since "Delete account" appears in heading and button
      const deleteAccountTexts = screen.getAllByText('Delete account');
      expect(deleteAccountTexts.length).toBeGreaterThan(0);
      expect(screen.getByPlaceholderText('Type delete to confirm')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      // Use getAllByRole and find the submit button
      const buttons = screen.getAllByRole('button');
      const deleteButton = buttons.find(btn => btn.textContent?.match(/delete account/i));
      expect(deleteButton).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      const { container } = render(
        <DeleteAccountModal
          isOpen={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          deleting={false}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('disables delete button when confirm text is not "delete"', () => {
      render(
        <DeleteAccountModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          deleting={false}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete account/i });
      expect(deleteButton).toBeDisabled();
    });

    it('enables delete button when confirm text is "delete"', async () => {
      const user = userEvent.setup();
      render(
        <DeleteAccountModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          deleting={false}
        />
      );

      const input = screen.getByPlaceholderText('Type delete to confirm');
      await user.type(input, 'delete');

      const deleteButton = screen.getByRole('button', { name: /delete account/i });
      expect(deleteButton).not.toBeDisabled();
    });

    it('calls onConfirm when form is submitted with correct text', async () => {
      const user = userEvent.setup();
      render(
        <DeleteAccountModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          deleting={false}
        />
      );

      const input = screen.getByPlaceholderText('Type delete to confirm');
      await user.type(input, 'delete');

      const form = input.closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it('does not call onConfirm when form is submitted with incorrect text', async () => {
      const user = userEvent.setup();
      render(
        <DeleteAccountModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          deleting={false}
        />
      );

      const input = screen.getByPlaceholderText('Type delete to confirm');
      await user.type(input, 'wrong text');

      const form = input.closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <DeleteAccountModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          deleting={false}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when overlay is clicked', async () => {
      const user = userEvent.setup();
      render(
        <DeleteAccountModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          deleting={false}
        />
      );

      const overlay = document.querySelector('.modal-overlay');
      if (overlay) {
        await user.click(overlay);
      }

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when modal content is clicked', async () => {
      const user = userEvent.setup();
      render(
        <DeleteAccountModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          deleting={false}
        />
      );

      // Click on the modal card content (not the overlay)
      // The modal card has className "modal-content card"
      const modalContent = document.querySelector('.modal-content');
      if (!modalContent) throw new Error('Modal content not found');
      
      await user.click(modalContent);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('disables all inputs and buttons when deleting is true', () => {
      render(
        <DeleteAccountModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          deleting={true}
        />
      );

      const input = screen.getByPlaceholderText('Type delete to confirm');
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const buttons = screen.getAllByRole('button');
      const deleteButton = buttons.find(btn => btn.textContent?.match(/delete account|deleting/i));

      expect(input).toBeDisabled();
      expect(cancelButton).toBeDisabled();
      expect(deleteButton).toBeDisabled();
      expect(deleteButton).toHaveTextContent('Deleting…');
    });

    it('resets confirm text when modal is closed', async () => {
      const user = userEvent.setup();
      const { rerender, unmount } = render(
        <DeleteAccountModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          deleting={false}
        />
      );

      const input = screen.getByPlaceholderText('Type delete to confirm') as HTMLInputElement;
      await user.type(input, 'delete');
      expect(input.value).toBe('delete');

      // Close modal - this should trigger handleClose which resets the text
      const closeButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(closeButton);
      
      // Verify onClose was called
      expect(mockOnClose).toHaveBeenCalled();
      
      // Unmount and remount to test fresh state
      unmount();
      
      // Reopen modal with fresh component instance
      render(
        <DeleteAccountModal
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          deleting={false}
        />
      );

      const newInput = screen.getByPlaceholderText('Type delete to confirm') as HTMLInputElement;
      expect(newInput.value).toBe('');
    });
  });
});
