import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiFetch } from '../utils/api';

export interface DashaMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface DashaContextValue {
  messages: DashaMessage[];
  streaming: boolean;
  error: string | null;
  widgetOpen: boolean;
  setWidgetOpen: (open: boolean) => void;
  send: (text: string) => Promise<void>;
  clear: () => void;
  setPageData: (snapshot: PageSnapshot) => void;
}

// Numbers from the last page that shared them, labelled with that page's path
interface PageSnapshot {
  path: string;
  data: unknown;
}

const DashaContext = createContext<DashaContextValue | null>(null);

/*
 * One conversation for the whole dashboard, shared by the floating widget and the Dasha page,
 * so you can start a question on one page and continue it on another.
 */
export const DashaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<DashaMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [widgetOpen, setWidgetOpen] = useState(false);
  // A ref, not state: page data changes on every slider move and shouldn't re-render the chat
  const pageDataRef = useRef<PageSnapshot | null>(null);
  const location = useLocation();

  const setPageData = useCallback((snapshot: PageSnapshot) => {
    pageDataRef.current = snapshot;
  }, []);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || streaming) return;

      const history: DashaMessage[] = [...messages, { role: 'user', content: question }];
      setMessages([...history, { role: 'assistant', content: '' }]);
      setStreaming(true);
      setError(null);

      const appendToAnswer = (chunk: string) =>
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          next[next.length - 1] = { ...last, content: last.content + chunk };
          return next;
        });

      try {
        const res = await apiFetch('/api/dasha/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: history,
            // Kept after leaving a page, so on the Dasha page she still knows e.g. the mortgage
            page: { current_path: location.pathname, last_page_data: pageDataRef.current },
          }),
        });

        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? 'Dasha could not answer right now.');
        }

        // The answer arrives as plain text chunks while Claude is writing it
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          appendToAnswer(decoder.decode(value, { stream: true }));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Dasha could not answer right now.');
        // Drop the empty answer bubble, keep the question so it can be retried
        setMessages((prev) => (prev[prev.length - 1]?.content === '' ? prev.slice(0, -1) : prev));
      } finally {
        setStreaming(false);
      }
    },
    [messages, streaming, location.pathname],
  );

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return (
    <DashaContext.Provider
      value={{ messages, streaming, error, widgetOpen, setWidgetOpen, send, clear, setPageData }}
    >
      {children}
    </DashaContext.Provider>
  );
};

export const useDasha = () => {
  const context = useContext(DashaContext);
  if (!context) throw new Error('useDasha must be used inside <DashaProvider>');
  return context;
};

// Pages call this to tell Dasha which numbers the user is looking at
export const useDashaPageData = (data: unknown) => {
  const { setPageData } = useDasha();
  const { pathname } = useLocation();

  useEffect(() => {
    setPageData({ path: pathname, data });
  }, [data, pathname, setPageData]);
};
