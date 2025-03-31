'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Message, useChat } from '@ai-sdk/react';
import { SendHorizonalIcon } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

const promptF1Suggestions = [
  'What is Formula 1?',
  'How does F1 scoring work?',
  'Tell me about the Ferrari F1 team',
  'Who drives for Mercedes in F1?',
  "What are Red Bull Racing's recent results?",
  "Tell me about Lewis Hamilton's career",
];

const Chat = () => {
  const { messages, append, input, handleInputChange, handleSubmit, status } =
    useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSuggestionClick = (suggestion: string) => {
    const msg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: suggestion,
    };
    append(msg);
  };

  useEffect(() => {
    if (messages.length > 0 || status === 'submitted') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, status]);

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto p-4">
      <div className="flex-grow overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg shadow ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-gray-200 text-gray-800 rounded-bl-none'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {status === 'submitted' && (
          <div className="flex justify-start">
            <div className="max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg shadow bg-gray-200 text-gray-800 rounded-bl-none animate-pulse">
              AI is thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2 justify-center">
        {promptF1Suggestions.map((suggestion) => (
          <Button
            key={suggestion}
            onClick={() => handleSuggestionClick(suggestion)}
            variant="outline"
            size="sm"
            disabled={status === 'submitted' || status === 'streaming'}
          >
            {suggestion}
          </Button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Input
          name="prompt"
          value={input}
          onChange={handleInputChange}
          placeholder="Ask something about F1..."
          className="flex-grow"
          disabled={status === 'submitted' || status === 'streaming'}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input || status === 'submitted' || status === 'streaming'}
        >
          <SendHorizonalIcon className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};

export default Chat;
