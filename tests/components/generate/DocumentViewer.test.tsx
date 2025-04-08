// app/components/generate/DocumentViewer.test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import { Suspense } from 'react';
import DocumentViewer from '../../../app/components/generate/DocumentViewer';

describe('DocumentViewer Component', () => {
    test('renders fallback message when no document is selected', () => {
        render(
            <Suspense fallback={<div>Loading</div>}>
                <DocumentViewer viewedDocumentString={null} />
            </Suspense>
        );
        expect(screen.getByText(/No document selected/)).toBeInTheDocument();
    });

});
