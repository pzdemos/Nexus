import React, { useState, useCallback, ChangeEvent, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// --- Type Definitions ---
interface ImageAsset {
  url: string;
  base64: string;
  mimeType: string;
}

interface ChatPart {
    text?: string;
    image?: ImageAsset;
    type?: 'loading';
}

interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    parts: ChatPart[];
}

type AnimationState = 'idle' | 'rotating' | 'flyingToSend' | 'loading' | 'flyingToInput';
type Coordinates = { x: number; y: number; width: number; height: number };

// --- SVG Icon Components ---

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.5 13.5a.75.75 0 01.75-.75h.75a.75.75 0 010 1.5h-.75a.75.75 0 01-.75-.75z" />
    </svg>
);

const PhotoIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
    </svg>
);

const EditIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
);

const PaperclipIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.122 2.122l7.81-7.81" />
    </svg>
);

const XMarkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ArrowUpIcon: React.FC<React.ComponentProps<'svg'>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
    </svg>
);

const ClipboardIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a2.25 2.25 0 01-2.25 2.25h-1.5a2.25 2.25 0 01-2.25-2.25v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
);

const ArrowDownTrayIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);

// --- Animation & Helper Components ---

const FlyingAirplane: React.FC<{
    startCoords: Coordinates;
    endCoords: Coordinates;
    onAnimationEnd: () => void;
}> = ({ startCoords, endCoords, onAnimationEnd }) => {
    const ANIMATION_DURATION = '0.9s';
    const EASING_FUNCTION = 'cubic-bezier(0.4, 0, 0.6, 1)';

    const animationName = useMemo(() => `fly-${crypto.randomUUID()}`, [startCoords, endCoords]);

    if (!startCoords || !endCoords) return null;

    const startX = startCoords.x + startCoords.width / 2 - 10;
    const startY = startCoords.y + startCoords.height / 2 - 10;
    const endX = endCoords.x + endCoords.width / 2 - 10;
    const endY = endCoords.y + endCoords.height / 2 - 10;

    const deltaX = endX - startX;
    const deltaY = endY - startY;

    // A more pronounced arc for better visual effect
    const arcHeight = -Math.max(40, Math.min(120, Math.abs(deltaY) * 0.5));

    const pathKeyframes = `
        @keyframes ${animationName} {
            0% { transform: translate(0, 0); }
            50% { transform: translate(${deltaX / 2}px, ${deltaY / 2 + arcHeight}px); }
            100% { transform: translate(${deltaX}px, ${deltaY}px); }
        }
    `;

    // Calculate tangent angle at different points for smooth rotation
    const getAngle = (t: number) => {
        // This calculates the derivative of a quadratic Bezier curve
        // which our 3-point keyframe path approximates.
        // y'(t) is based on the parabolic path: y(t) = 4*arc*t*(1-t) + deltaY*t
        const dy = 4 * arcHeight * (1 - 2 * t) + deltaY;
        const dx = deltaX;
        // Add a small epsilon to dx to avoid division by zero if deltaX is 0
        return Math.atan2(dy, dx + 0.0001) * (180 / Math.PI);
    };

    const rotationAnimationName = `${animationName}-rotate`;
    const rotationKeyframes = `
        @keyframes ${rotationAnimationName} {
            0%   { transform: rotate(${getAngle(0)}deg); }
            25%  { transform: rotate(${getAngle(0.25)}deg); }
            50%  { transform: rotate(${getAngle(0.5)}deg); }
            75%  { transform: rotate(${getAngle(0.75)}deg); }
            100% { transform: rotate(${getAngle(1)}deg); }
        }
    `;

    const containerStyle: React.CSSProperties = {
        position: 'fixed',
        left: startX,
        top: startY,
        animation: `${animationName} ${ANIMATION_DURATION} ${EASING_FUNCTION} forwards`,
        zIndex: 50,
    };

    const iconContainerStyle: React.CSSProperties = {
        animation: `${rotationAnimationName} ${ANIMATION_DURATION} ${EASING_FUNCTION} forwards`,
    };

    return (
        <>
            <style>{pathKeyframes}{rotationKeyframes}</style>
            <div style={containerStyle} onAnimationEnd={onAnimationEnd}>
                <div style={iconContainerStyle}>
                    <ArrowUpIcon className="w-5 h-5 text-blue-600" />
                </div>
            </div>
        </>
    );
};


const LoadingMessage = React.forwardRef<HTMLDivElement, { isSpinning: boolean }>(({ isSpinning }, ref) => {
    return (
        <div ref={ref} className="flex justify-start gap-3">
            <div className="bg-neutral-200 p-3 rounded-2xl w-14 h-12 flex items-center justify-center">
                {isSpinning && (
                    // This parent container spins, creating the orbit
                    <div className="animate-loading-orbit-ccw">
                        {/* This child container provides the offset from the center, creating the radius */}
                        <div className="translate-x-2">
                             {/* The icon is rotated to point "forward" along the orbit path */}
                             <ArrowUpIcon className="w-5 h-5 text-blue-600 -rotate-90"/>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});


// --- App Component ---
const App: React.FC = () => {
  const [activeImage, setActiveImage] = useState<ImageAsset | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'chat' | 'image'>('chat');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Animation state
  const [animationState, setAnimationState] = useState<AnimationState>('idle');
  const [flightPath, setFlightPath] = useState<{ start: Coordinates; end: Coordinates } | null>(null);
  const latestMessageId = useRef<string | null>(null);
  const inputCoords = useRef<Coordinates | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);
  const loadingMessageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [prompt]);

  // --- Animation Orchestration ---
  useEffect(() => {
    const performApiCall = async () => {
        if (animationState !== 'loading') return;
        
        const lastUserMessage = chatHistory[chatHistory.length - 2];
        const currentPrompt = lastUserMessage.parts.find(p => p.text)?.text || '';
        
        // Use a placeholder for the active image to avoid stale closures
        const imageForApi = activeImage;

        try {
            // NOTE: Replace with your deployed backend URL
            const API_ENDPOINT = 'http://localhost:3001/api/generate';

            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: currentPrompt,
                    image: imageForApi ? { base64: imageForApi.base64, mimeType: imageForApi.mimeType } : null,
                    mode: mode
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            let modelMessage: ChatMessage;

            if (mode === 'image') {
                const firstPart = data?.candidates?.[0]?.content?.parts?.[0];
                if (firstPart?.inlineData) {
                    const newImageAsset: ImageAsset = {
                        url: `data:${firstPart.inlineData.mimeType};base64,${firstPart.inlineData.data}`,
                        base64: firstPart.inlineData.data,
                        mimeType: firstPart.inlineData.mimeType
                    };
                    modelMessage = { id: crypto.randomUUID(), role: 'model', parts: [{ image: newImageAsset }] };
                    setActiveImage(newImageAsset);
                } else {
                    const fallbackText = data.text || "抱歉，我无法根据该提示词生成图片。";
                    setError("无法生成图片。响应可能被阻止或不包含图像数据。");
                    modelMessage = { id: crypto.randomUUID(), role: 'model', parts: [{ text: fallbackText }] };
                }
            } else {
                 modelMessage = { id: crypto.randomUUID(), role: 'model', parts: [{ text: data.text }] };
            }

            latestMessageId.current = modelMessage.id;
            setChatHistory(prev => prev.map(msg => msg.id === 'loading-placeholder' ? modelMessage : msg));

        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : "发生未知错误。";
            setError(errorMessage);
            const modelMessage: ChatMessage = { id: crypto.randomUUID(), role: 'model', parts: [{ text: `发生错误：${errorMessage}` }] };
            latestMessageId.current = modelMessage.id;
            setChatHistory(prev => prev.map(msg => msg.id === 'loading-placeholder' ? modelMessage : msg));
        }
    };
    
    performApiCall();

  }, [animationState, chatHistory]);


  useEffect(() => {
    // Stage 2: Prepare for flight by getting destination coordinates
    if (animationState === 'rotating' && loadingMessageRef.current && flightPath && flightPath.start === flightPath.end) {
      const endCoords = loadingMessageRef.current.getBoundingClientRect();
      setFlightPath(prev => prev ? { ...prev, end: endCoords } : null);
    }

    // Stage 4: Fly back to input
    if (latestMessageId.current && inputCoords.current) {
        const finalMessageElement = document.getElementById(latestMessageId.current);
        if (finalMessageElement) {
            const finalCoords = finalMessageElement.getBoundingClientRect();
            setFlightPath({ start: finalCoords, end: inputCoords.current });
            setAnimationState('flyingToInput');
            latestMessageId.current = null;
        }
    }
  }, [chatHistory, animationState, flightPath]);


  // --- User Interaction Handlers ---

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const base64 = await blobToBase64(file);
      const imageAsset = { url: URL.createObjectURL(file), base64, mimeType: file.type };
      setActiveImage(imageAsset);
      setError(null);
    }
  };
  
  const handleRemoveImage = () => {
    if (activeImage?.url.startsWith('blob:')) URL.revokeObjectURL(activeImage.url);
    setActiveImage(null);
    setError(null);
  }

  const handleCopy = (textToCopy: string, messageId: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleDownload = (image: ImageAsset) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = `gemini-image-${Date.now()}.${image.mimeType.split('/')[1] || 'png'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sendMessage = useCallback(async () => {
    if (!prompt.trim() || animationState !== 'idle') return;

    setError(null);
    const startCoords = sendButtonRef.current?.getBoundingClientRect();
    if (!startCoords) return;
    
    inputCoords.current = startCoords; // Save for return flight

    const currentPrompt = prompt;
    setPrompt('');

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', parts: [{ text: currentPrompt }] };
    const loadingMessage: ChatMessage = { id: 'loading-placeholder', role: 'model', parts: [{ type: 'loading' }] };
    
    // Set a temporary end point, it will be updated once the loading message is rendered
    setFlightPath({ start: startCoords, end: startCoords }); 
    setChatHistory(prev => [...prev, userMessage, loadingMessage]);
    setAnimationState('rotating');

  }, [prompt, animationState]);

  const getPlaceholderText = () => {
    if (mode === 'image') return activeImage ? "描述你想要的编辑效果..." : "输入提示词来生成图片...";
    return activeImage ? "就这张图片提问..." : "开始对话...";
  };

  return (
    <div className="min-h-screen bg-white text-neutral-800 flex flex-col font-sans">
        {(animationState === 'flyingToSend' || animationState === 'flyingToInput') && flightPath?.start && flightPath?.end && (
            <FlyingAirplane
                startCoords={flightPath.start}
                endCoords={flightPath.end}
                onAnimationEnd={() => setAnimationState(animationState === 'flyingToSend' ? 'loading' : 'idle')}
            />
        )}
      <header className="w-full max-w-6xl mx-auto text-center my-6 md:my-8 px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500">
          Nexus
        </h1>
        <p className="text-neutral-500 mt-2 text-lg">
           与 AI 对话，将想象铸成图像。
        </p>
        <a href="http://www.haoaiganfan.top" target="_blank" rel="noopener noreferrer" className="text-sm text-neutral-400 hover:text-blue-500 transition-colors mt-2 inline-block">
            官网: www.haoaiganfan.top
        </a>
      </header>

      <main className="flex-grow w-full max-w-3xl mx-auto p-4 flex flex-col">
        <div className="flex-grow space-y-6 pb-40">
            {chatHistory.length === 0 && !activeImage && (
              <div className="flex-grow flex flex-col items-center justify-center text-center h-full">
                <EditIcon className="w-20 h-20 text-neutral-300 mb-6" />
                <h2 className="text-3xl font-semibold text-neutral-700 tracking-wide">灵感，即刻成像</h2>
                <p className="text-lg text-neutral-500 mt-4 max-w-md leading-relaxed">
                   在此与 AI 自由对话，或上传图片，让它成为你创意的起点。
                </p>
              </div>
            )}

            {chatHistory.map((message) => {
                if (message.parts[0]?.type === 'loading') {
                    return <LoadingMessage key={message.id} ref={loadingMessageRef} isSpinning={animationState === 'loading'} />
                }
                return (
                    <div id={message.id} key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-xl min-w-0">
                            <div className={`space-y-2 p-3 rounded-2xl ${message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-neutral-200 text-neutral-800'}`}>
                                {message.parts.map((part, partIndex) => {
                                    if (part.text) {
                                        return message.role === 'model' ? (
                                            <div key={partIndex} className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown></div>
                                        ) : <p key={partIndex} className="whitespace-pre-wrap">{part.text}</p>
                                    }
                                    if (part.image) {
                                        return (
                                            <div key={partIndex} className="rounded-xl overflow-hidden border border-neutral-300 bg-black">
                                                <img src={part.image.url} alt="Generated content" className="w-full h-auto object-contain max-h-[70vh]" />
                                            </div>
                                        )
                                    }
                                    return null;
                                })}
                            </div>
                            {message.role === 'model' && (
                                <div className="mt-2 px-2 flex items-center justify-start gap-2">
                                    {message.parts.some(p => p.text) && (
                                        <button onClick={() => handleCopy(message.parts.filter(p => p.text).map(p => p.text!).join('\n\n'), message.id)} className="text-neutral-500 hover:text-blue-600 p-1 rounded-full hover:bg-neutral-100 transition-colors" aria-label={copiedMessageId === message.id ? "已复制" : "复制"}>
                                            {copiedMessageId === message.id ? <CheckIcon className="w-4 h-4 text-green-600" /> : <ClipboardIcon className="w-4 h-4" />}
                                        </button>
                                    )}
                                    {message.parts.filter(p => p.image).map((part, index) => (
                                        <button key={index} onClick={() => handleDownload(part.image!)} className="text-neutral-500 hover:text-blue-600 p-1 rounded-full hover:bg-neutral-100 transition-colors" aria-label="下载图片">
                                            <ArrowDownTrayIcon className="w-4 h-4" />
                                        </button>
                                    ))}
                                </div>
                            )}
                    </div>
                    </div>
                );
            })}
            <div ref={chatEndRef} />
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm p-4 border-t border-neutral-200/50">
        <div className="max-w-3xl mx-auto relative">
            {error && <p className="text-red-500 text-center mb-2 text-sm">{error}</p>}

             <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center gap-1 p-1 bg-neutral-100 rounded-full border border-neutral-200 shadow-md">
                <div className="absolute top-1 bottom-1 w-9 h-9 bg-white rounded-full shadow-md transition-transform duration-300 ease-in-out" style={{ transform: mode === 'chat' ? 'translateX(0px)' : 'translateX(calc(100% + 4px))' }}></div>
                <button onClick={() => setMode('chat')} className="relative z-10 p-1.5 rounded-full transition-colors" aria-label="切换到聊天模式"><SparklesIcon className={`w-6 h-6 ${mode === 'chat' ? 'text-blue-600' : 'text-neutral-500'}`} /></button>
                <button onClick={() => setMode('image')} className="relative z-10 p-1.5 rounded-full transition-colors" aria-label="切换到图像模式"><PhotoIcon className={`w-6 h-6 ${mode === 'image' ? 'text-blue-600' : 'text-neutral-500'}`} /></button>
            </div>
            
            <div className="relative bg-white border border-neutral-300 rounded-3xl shadow-lg pt-8 p-4 flex items-end gap-3">
                {activeImage && (
                  <div className="relative flex-shrink-0">
                      <img src={activeImage.url} className="h-10 w-10 object-cover rounded-full" alt="当前图片缩略图" />
                      <button onClick={handleRemoveImage} className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 text-neutral-600 hover:bg-red-500 hover:text-white transition-colors shadow" aria-label="移除当前图片"><XMarkIcon className="w-3 h-3" /></button>
                  </div>
                )}

                <label htmlFor="file-upload" className="flex-shrink-0 flex items-center p-2 rounded-full hover:bg-neutral-200 cursor-pointer transition-colors" aria-label="上传图片"><PaperclipIcon className="w-6 h-6 text-neutral-500" /></label>
                <input id="file-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />

                <div className="flex-grow relative">
                    <textarea ref={textareaRef} rows={1} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={getPlaceholderText()} className="w-full bg-transparent focus:outline-none text-neutral-800 placeholder-neutral-500 py-2 pr-12 resize-none overflow-y-auto max-h-48"/>
                    {animationState === 'idle' && (
                         <button ref={sendButtonRef} onClick={sendMessage} disabled={!prompt.trim()} className={`absolute bottom-2 right-2 w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${!prompt.trim() ? 'text-neutral-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-100'}`} aria-label="发送消息">
                            <ArrowUpIcon className="w-5 h-5" />
                        </button>
                    )}
                     {animationState === 'rotating' && (
                         <div className="absolute bottom-2 right-2 w-9 h-9 rounded-full flex items-center justify-center">
                            <ArrowUpIcon 
                                className="w-5 h-5 text-blue-600 animate-rotate-once-ccw"
                                onAnimationEnd={() => setAnimationState('flyingToSend')}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
