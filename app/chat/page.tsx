'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChat } from '@ai-sdk/react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/qna',
  });
  return (
    <div className="">
      {messages.map(m => (
        <div key={m.id} className="">
          {m.role === 'user' ? 'User: ' : 'AI: '}
          {m.content}
        </div>
      ))}
      <form onSubmit={handleSubmit} id="chat-form" className='flex w-full max-w-sm items-center space-x-2'>
        <Input 
            id='chat-input' 
            value={input} 
            onChange={handleInputChange} 
            type="text" 
            placeholder="Say something..." 
        />
        <Button id="chat-submit" type="submit">Send</Button>
      </form>
    </div>
  );
}