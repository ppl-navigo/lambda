import { render, screen } from '@testing-library/react';
import DocumentHistory from '../../app/generate/history/page';

describe('DocumentHistory Page', () => {
    it('renders the Sidebar and DocumentViewer components', () => {
        render(<DocumentHistory />);

        // Verify the sidebar contain username
        expect(screen.getByText("🔺 Alicia Koch")).toBeInTheDocument();

        // Verify the DocumentViewer fallback message
        expect(screen.getByText(/No document selected/)).toBeInTheDocument();
    });
});