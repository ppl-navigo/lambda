import { POST } from '@/app/api/payment/success/route';
import { supabase } from '@/utils/supabase';
import { createHash } from 'node:crypto';

// Mock dependencies
jest.mock('@/utils/supabase', () => ({
    supabase: {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn(),
    },
}));

// Fix the crypto mocking
const mockDigest = jest.fn().mockReturnValue('validSignature');
const mockUpdate = jest.fn().mockReturnValue({ digest: mockDigest });
const mockCreateHashFn = jest.fn().mockReturnValue({ update: mockUpdate });

jest.mock('node:crypto', () => ({
    createHash: jest.fn().mockImplementation(() => ({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('validSignature'),
    })),
}));

const mockSupabaseFrom = supabase.from as jest.MockedFunction<typeof supabase.from>;
const mockSupabaseInsert = jest.fn().mockReturnThis();
const mockSupabaseSelect = jest.fn();

describe('Payment Success API Route', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.MIDTRANS_SERVER_KEY = 'test-server-key';

        // Configure supabase mocks
        mockSupabaseFrom.mockReturnValue({
            insert: mockSupabaseInsert,
            select: mockSupabaseSelect,
        } as any);

        // Reset the crypto mock to the default value
        (createHash as jest.Mock).mockImplementation(() => ({
            update: jest.fn().mockReturnThis(),
            digest: jest.fn().mockReturnValue('validSignature'),
        }));
    });

    it('should return error for missing fields', async () => {
        // Test cases with missing fields
        const testCases = [
            { payload: { status_code: '200', gross_amount: '100000', signature_key: 'validSignature' }, missing: 'order_id' },
            { payload: { order_id: 'test-order', gross_amount: '100000', signature_key: 'validSignature' }, missing: 'status_code' },
            { payload: { order_id: 'test-order', status_code: '200', signature_key: 'validSignature' }, missing: 'gross_amount' },
            { payload: { order_id: 'test-order', status_code: '200', gross_amount: '100000' }, missing: 'signature_key' },
        ];

        for (const testCase of testCases) {
            const request = new Request('http://localhost:3000/api/payment/success', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testCase.payload),
            });

            const response = await POST(request);
            // Check if response is defined before proceeding
            expect(response).toBeDefined();
            if (!response) throw new Error('Response is undefined');

            const responseData = await response.json();

            expect(response.status).toBe(400);
            expect(responseData).toEqual({ error: 'Missing required fields' });
        }
    });

    it('should return error for invalid gross amount', async () => {
        const payload = {
            order_id: 'test-order',
            status_code: '200',
            gross_amount: '0',
            signature_key: 'validSignature',
        };

        const request = new Request('http://localhost:3000/api/payment/success', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const response = await POST(request);
        // Check if response is defined before proceeding
        expect(response).toBeDefined();
        if (!response) throw new Error('Response is undefined');

        const responseData = await response.json();

        expect(response.status).toBe(400);
        expect(responseData).toEqual({ error: 'Gross amount must be greater than 0' });
    });

    it('should return error for invalid signature', async () => {
        // Override the crypto mock to return a different signature
        (createHash as jest.Mock).mockImplementation(() => ({
            update: jest.fn().mockReturnThis(),
            digest: jest.fn().mockReturnValue('invalidSignature'),
        }));

        const payload = {
            order_id: 'test-order',
            status_code: '200',
            gross_amount: '100000',
            signature_key: 'validSignature', // This doesn't match our mocked 'invalidSignature'
        };

        const request = new Request('http://localhost:3000/api/payment/success', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const response = await POST(request);
        // Check if response is defined before proceeding
        expect(response).toBeDefined();
        if (!response) throw new Error('Response is undefined');

        const responseData = await response.json();

        expect(response.status).toBe(400);
        expect(responseData).toEqual({ error: 'Invalid signature' });
    });

    it('should process successful payment with capture status', async () => {
        // Reset the crypto mock to return a matching signature
        (createHash as jest.Mock).mockImplementation(() => ({
            update: jest.fn().mockReturnThis(),
            digest: jest.fn().mockReturnValue('validSignature'),
        }));

        // Mock successful DB insert
        mockSupabaseSelect.mockResolvedValue({
            data: [{
                id: 1,
                order_id: 'test-order',
                gross_amount: 100000,
                transaction_status: 'capture',
                transaction_time: '2023-01-01 12:00:00',
                signature_key: 'validSignature',
                payment_type: 'credit_card',
            }],
            error: null,
        });

        const payload = {
            order_id: 'test-order',
            status_code: '200',
            gross_amount: '100000',
            signature_key: 'validSignature',
            transaction_status: 'capture',
            fraud_status: 'accept',
            transaction_time: '2023-01-01 12:00:00',
            payment_type: 'credit_card',
        };

        const request = new Request('http://localhost:3000/api/payment/success', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const response = await POST(request);
        // Check if response is defined before proceeding
        expect(response).toBeDefined();
        if (!response) throw new Error('Response is undefined');

        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.message).toBe('Payment success');
        expect(responseData.data).toBeDefined();
        expect(mockSupabaseFrom).toHaveBeenCalledWith('payments');
        expect(mockSupabaseInsert).toHaveBeenCalledWith({
            order_id: 'test-order',
            gross_amount: 100000,
            transaction_status: 'capture',
            transaction_time: '2023-01-01 12:00:00',
            signature_key: 'validSignature',
            payment_type: 'credit_card',
        });
    });

    it('should process successful payment with settlement status', async () => {
        // Reset the crypto mock
        (createHash as jest.Mock).mockImplementation(() => ({
            update: jest.fn().mockReturnThis(),
            digest: jest.fn().mockReturnValue('validSignature'),
        }));

        // Mock successful DB insert
        mockSupabaseSelect.mockResolvedValue({
            data: [{
                id: 1,
                order_id: 'test-order',
                gross_amount: 100000,
                transaction_status: 'settlement',
                transaction_time: '2023-01-01 12:00:00',
                signature_key: 'validSignature',
                payment_type: 'bank_transfer',
            }],
            error: null,
        });

        const payload = {
            order_id: 'test-order',
            status_code: '200',
            gross_amount: '100000',
            signature_key: 'validSignature',
            transaction_status: 'settlement',
            transaction_time: '2023-01-01 12:00:00',
            payment_type: 'bank_transfer',
        };

        const request = new Request('http://localhost:3000/api/payment/success', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const response = await POST(request);
        // Check if response is defined before proceeding
        expect(response).toBeDefined();
        if (!response) throw new Error('Response is undefined');

        const responseData = await response.json();

        expect(response.status).toBe(200);
        expect(responseData.message).toBe('Payment success');
        expect(responseData.data).toBeDefined();
        expect(mockSupabaseFrom).toHaveBeenCalledWith('payments');
        expect(mockSupabaseInsert).toHaveBeenCalledWith({
            order_id: 'test-order',
            gross_amount: 100000,
            transaction_status: 'settlement',
            transaction_time: '2023-01-01 12:00:00',
            signature_key: 'validSignature',
            payment_type: 'bank_transfer',
        });
    });

    it('should handle database error', async () => {
        // Reset the crypto mock
        (createHash as jest.Mock).mockImplementation(() => ({
            update: jest.fn().mockReturnThis(),
            digest: jest.fn().mockReturnValue('validSignature'),
        }));

        // Mock database error
        mockSupabaseSelect.mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
        });

        const payload = {
            order_id: 'test-order',
            status_code: '200',
            gross_amount: '100000',
            signature_key: 'validSignature',
            transaction_status: 'capture',
            fraud_status: 'accept',
            transaction_time: '2023-01-01 12:00:00',
            payment_type: 'credit_card',
        };

        const request = new Request('http://localhost:3000/api/payment/success', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const response = await POST(request);
        // Check if response is defined before proceeding
        expect(response).toBeDefined();
        if (!response) throw new Error('Response is undefined');

        const responseData = await response.json();

        expect(response.status).toBe(500);
        expect(responseData).toEqual({ error: 'Database error' });
    });
});
