import { POST } from '@/app/api/payment/route';
import axios from 'axios';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';

// Mock dependencies
jest.mock('axios');
jest.mock('crypto', () => ({
    randomUUID: jest.fn(),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedRandomUUID = randomUUID as jest.MockedFunction<typeof randomUUID>;

describe('Payment API Route', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.MIDTRANS_SERVER_KEY = 'test-server-key';
        mockedRandomUUID.mockReturnValue('12345678-1234-1234-1234-123456789012');
    });

    it('should return successful payment response', async () => {
        // Mock successful payment response
        const mockResponse = {
            data: {
                token: 'test-token',
                redirect_url: 'https://example.com/payment'
            }
        };
        mockedAxios.post.mockResolvedValue(mockResponse);

        // Test payload
        const payload = {
            gross_amount: 100000,
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@example.com'
        };

        // Create request with payload
        const request = new Request('http://localhost:3000/api/payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const response = await POST(request);
        const responseData = await response.json();

        // Assertions
        expect(mockedAxios.post).toHaveBeenCalledWith(
            'https://app.sandbox.midtrans.com/snap/v1/transactions',
            {
                transaction_details: {
                    order_id: '12345678-1234-1234-1234-123456789012',
                    gross_amount: 100000,
                },
                customer_details: {
                    first_name: 'John',
                    last_name: 'Doe',
                    email: 'john.doe@example.com',
                },
            },
            {
                headers: {
                    'Authorization': 'Basic dGVzdC1zZXJ2ZXIta2V5Og==',
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                }
            }
        );
        expect(responseData).toEqual(mockResponse.data);
    });

    it('should return error for missing fields', async () => {
        // Test payloads with missing fields
        const testCases = [
            { payload: { last_name: 'Doe', email: 'john@example.com', gross_amount: 100000 }, missing: 'first_name' },
            { payload: { first_name: 'John', email: 'john@example.com', gross_amount: 100000 }, missing: 'last_name' },
            { payload: { first_name: 'John', last_name: 'Doe', gross_amount: 100000 }, missing: 'email' },
            { payload: { first_name: 'John', last_name: 'Doe', email: 'john@example.com' }, missing: 'gross_amount' },
        ];

        for (const testCase of testCases) {
            const request = new Request('http://localhost:3000/api/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testCase.payload),
            });

            const response = await POST(request);
            const responseData = await response.json();

            expect(response.status).toBe(400);
            expect(responseData).toEqual({ error: 'Missing required fields' });
        }
    });

    it('should return error for invalid gross amount', async () => {
        // Test payload with invalid amount
        const payload = {
            gross_amount: 0,
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@example.com'
        };

        const request = new Request('http://localhost:3000/api/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
    });

    it('should handle API errors', async () => {
        // Mock API error
        const errorMessage = 'Payment gateway error';
        mockedAxios.post.mockRejectedValue(new Error(errorMessage));

        // Test payload
        const payload = {
            gross_amount: 100000,
            first_name: 'John',
            last_name: 'Doe',
            email: 'john.doe@example.com'
        };

        // Create request with payload
        const request = new Request('http://localhost:3000/api/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        // Expect the function to throw an error
        await expect(POST(request)).rejects.toThrow(errorMessage);
    });
});
