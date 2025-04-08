// app/components/generate/Sidebar.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../../../app/components/generate/Sidebar';

interface Document {
    title: string;
    content: string;
    time: string;
}

// Define our own dynamic documents for testing
const testDocuments: Document[] = [
    {
        title: "Test Document 1",
        time: "Today",
        content: "# Test Document 1 Content\n\nSome content for document 1.",
    },
    {
        title: "Test Document 2",
        time: "Yesterday",
        content: "# Test Document 2 Content\n\nSome content for document 2.",
    },
];

describe('Sidebar Component', () => {
    const setIsSidebarVisible = jest.fn();
    const setViewedDocumentString = jest.fn();

    beforeEach(() => {
        setIsSidebarVisible.mockClear();
        setViewedDocumentString.mockClear();
    });

    test('renders document titles from dynamic documents', () => {
        render(
            <Sidebar
                isSidebarVisible={true}
                setIsSidebarVisible={setIsSidebarVisible}
                viewedDocumentString={null}
                setViewedDocumentString={setViewedDocumentString}
                documents={testDocuments} // Pass our own documents
            />
        );

        // Check for test document titles
        expect(screen.getByText("Test Document 1")).toBeInTheDocument();
        expect(screen.getByText("Test Document 2")).toBeInTheDocument();
    });

    test('filters documents based on search input', () => {
        render(
            <Sidebar
                isSidebarVisible={true}
                setIsSidebarVisible={setIsSidebarVisible}
                viewedDocumentString={null}
                setViewedDocumentString={setViewedDocumentString}
                documents={testDocuments}
            />
        );

        // Type into the search input to filter the list
        const searchInput = screen.getByPlaceholderText('Search...');
        fireEvent.change(searchInput, { target: { value: 'Document 1' } });

        // Expect only "Test Document 1" to be visible
        expect(screen.getByText("Test Document 1")).toBeInTheDocument();
        expect(screen.queryByText("Test Document 2")).toBeNull();
    });

    test('calls setViewedDocumentString when a document is clicked', () => {
        render(
            <Sidebar
                isSidebarVisible={true}
                setIsSidebarVisible={setIsSidebarVisible}
                viewedDocumentString={null}
                setViewedDocumentString={setViewedDocumentString}
                documents={testDocuments}
            />
        );

        const docElement = screen.getByText("Test Document 1");
        fireEvent.click(docElement);

        // Verify that the callback is called with the content of the first test document
        expect(setViewedDocumentString).toHaveBeenCalledWith(testDocuments[0].content);
    });

    test('toggle sidebar button calls setIsSidebarVisible', () => {
        render(
            <Sidebar
                isSidebarVisible={true}
                setIsSidebarVisible={setIsSidebarVisible}
                viewedDocumentString={null}
                setViewedDocumentString={setViewedDocumentString}
                documents={testDocuments}
            />
        );

        const toggleButton = screen.getByRole('button');
        fireEvent.click(toggleButton);

        expect(setIsSidebarVisible).toHaveBeenCalled();
    });
});
