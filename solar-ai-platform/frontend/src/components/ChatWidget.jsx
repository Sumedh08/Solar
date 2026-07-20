import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Sun, Send, Image, Wrench, ShieldAlert } from 'lucide-react';
import { endpoints } from '../config';

/**
 * Floating chat widget that connects to the /api/chat LangGraph agent.
 * Features: conversation history, image upload (PanelGuard), quick chips,
 * tool-use indicators, and guardrail rejection styling.
 */

const QUICK_CHIPS = [
    { label: '☀️ 3kW ROI in Delhi', msg: 'What is the ROI for a 3kW rooftop solar system in Delhi?' },
    { label: '⚡ Forecast next week', msg: 'Forecast solar generation for next week at 1 MW capacity' },
    { label: '🛡️ Panel defect help', msg: 'How do I check my solar panels for defects?' },
    { label: '💰 PM Surya Ghar', msg: 'What subsidy can I get under PM Surya Ghar scheme?' },
];

/* Simple markdown-ish render for bot messages */
function renderMarkdown(text) {
    if (!text) return '';
    const lines = text.split('\n');
    const result = [];
    let inList = false;
    let listItems = [];

    const flushList = () => {
        if (listItems.length > 0) {
            result.push(<ul key={`ul-${result.length}`}>{listItems}</ul>);
            listItems = [];
            inList = false;
        }
    };

    lines.forEach((line, i) => {
        const trimmed = line.trim();

        // List items (- or •  or * )
        const listMatch = trimmed.match(/^[-•*]\s+(.*)/);
        if (listMatch) {
            inList = true;
            listItems.push(
                <li key={`li-${i}`} dangerouslySetInnerHTML={{
                    __html: inlineMd(listMatch[1])
                }} />
            );
            return;
        }

        flushList();

        if (!trimmed) {
            result.push(<br key={`br-${i}`} />);
            return;
        }

        // Heading-like lines (##)
        const headMatch = trimmed.match(/^#{1,3}\s+(.*)/);
        if (headMatch) {
            result.push(
                <strong key={`h-${i}`} style={{ display: 'block', marginTop: '0.5rem' }}
                    dangerouslySetInnerHTML={{ __html: inlineMd(headMatch[1]) }} />
            );
            return;
        }

        result.push(
            <span key={`p-${i}`} style={{ display: 'block' }}
                dangerouslySetInnerHTML={{ __html: inlineMd(trimmed) }} />
        );
    });

    flushList();
    return result;
}

function inlineMd(text) {
    return text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
        .replace(/₹/g, '₹');
}

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]); // {role, content, intent?, provider?, allowed?, toolResult?}
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [showChips, setShowChips] = useState(true);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading, scrollToBottom]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    /* Convert image file to base64 */
    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleImageSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const clearImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const sendMessage = async (text) => {
        const msg = (text || input).trim();
        if (!msg && !imageFile) return;

        setShowChips(false);
        const userMsg = { role: 'user', content: msg || '(image uploaded)' };
        if (imagePreview) userMsg.imagePreview = imagePreview;
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            // Build history for API (last 10 messages)
            const historyForApi = messages.slice(-10).map(m => ({
                role: m.role,
                content: m.content,
            }));

            const body = {
                message: msg || 'Please analyze this panel image.',
                history: historyForApi,
            };

            // Attach image if present
            if (imageFile) {
                body.image_b64 = await fileToBase64(imageFile);
                body.image_media_type = imageFile.type || 'image/jpeg';
                clearImage();
            }

            const resp = await fetch(endpoints.chat, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!resp.ok) {
                throw new Error(`Server error: ${resp.status}`);
            }

            const data = await resp.json();

            const botMsg = {
                role: 'assistant',
                content: data.reply || 'Sorry, I couldn\'t generate a response.',
                intent: data.intent,
                provider: data.provider_used,
                allowed: data.allowed,
                toolResult: data.tool_result,
            };

            setMessages(prev => [...prev, botMsg]);
        } catch (err) {
            console.error('Chat error:', err);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Connection error — please make sure the backend is running on port 5000.\n\n\`${err.message}\``,
                intent: 'error',
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const getToolLabel = (intent, provider) => {
        if (!intent || intent === 'general' || intent === 'reject' || intent === 'error') return null;
        const labels = {
            suncalc: 'SunCalc Tool',
            gridsmart: 'GridSmart Tool',
            panelguard: 'PanelGuard Tool',
        };
        return labels[intent] || null;
    };

    /* ── Collapsed: floating button ── */
    if (!isOpen) {
        return (
            <button
                className="chat-fab"
                onClick={() => setIsOpen(true)}
                aria-label="Open chat"
                id="chat-fab-button"
            >
                <MessageCircle size={26} />
            </button>
        );
    }

    /* ── Expanded: chat panel ── */
    return (
        <div className="chat-panel" id="chat-panel">
            {/* Header */}
            <div className="chat-header">
                <div className="chat-header-info">
                    <div className="chat-header-icon">
                        <Sun size={18} />
                    </div>
                    <div className="chat-header-text">
                        <h3>Solar.ai Assistant</h3>
                        <p>Powered by LangGraph + OpenRouter</p>
                    </div>
                </div>
                <button className="chat-close-btn" onClick={() => setIsOpen(false)} aria-label="Close chat">
                    <X size={20} />
                </button>
            </div>

            {/* Quick chips */}
            {showChips && messages.length === 0 && (
                <div className="chat-chips">
                    {QUICK_CHIPS.map((chip, i) => (
                        <button key={i} className="chat-chip" onClick={() => sendMessage(chip.msg)}>
                            {chip.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Messages */}
            <div className="chat-messages">
                {messages.length === 0 && (
                    <div className="chat-welcome">
                        <div className="chat-welcome-icon">
                            <Sun size={24} />
                        </div>
                        <h4>Welcome to Solar.ai Chat</h4>
                        <p>
                            Ask about rooftop solar ROI, energy forecasts,<br />
                            panel defects, subsidies, or upload a panel photo.
                        </p>
                    </div>
                )}

                {messages.map((msg, i) => {
                    if (msg.role === 'user') {
                        return (
                            <div key={i} className="chat-msg chat-msg-user">
                                {msg.imagePreview && (
                                    <img
                                        src={msg.imagePreview}
                                        alt="Uploaded panel"
                                        style={{
                                            width: '100%',
                                            maxWidth: '180px',
                                            borderRadius: '10px',
                                            marginBottom: '0.375rem',
                                            display: 'block',
                                        }}
                                    />
                                )}
                                {msg.content}
                            </div>
                        );
                    }

                    // Bot message
                    const isRejected = msg.allowed === false || msg.intent === 'reject';
                    const toolLabel = getToolLabel(msg.intent, msg.provider);

                    return (
                        <div key={i}>
                            <div className={`chat-msg ${isRejected ? 'chat-msg-rejected' : 'chat-msg-bot'}`}>
                                {isRejected && (
                                    <div className="reject-badge">
                                        <ShieldAlert size={12} /> Off-Topic Guard
                                    </div>
                                )}
                                <div>{renderMarkdown(msg.content)}</div>
                            </div>
                            {toolLabel && (
                                <div className="chat-tool-badge">
                                    <Wrench /> {toolLabel}
                                </div>
                            )}
                        </div>
                    );
                })}

                {loading && (
                    <div className="chat-typing">
                        <span /><span /><span />
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Image preview */}
            {imagePreview && (
                <div className="chat-img-preview">
                    <img src={imagePreview} alt="Preview" />
                    <span>Panel image attached</span>
                    <button className="chat-img-remove" onClick={clearImage}>✕</button>
                </div>
            )}

            {/* Input */}
            <div className="chat-input-area">
                <div className="chat-input-wrapper">
                    <textarea
                        ref={inputRef}
                        className="chat-input"
                        placeholder="Ask about solar energy..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        disabled={loading}
                        id="chat-input-field"
                    />
                    <button
                        className="chat-img-btn"
                        onClick={() => fileInputRef.current?.click()}
                        title="Upload panel image"
                        aria-label="Upload image"
                    >
                        <Image size={16} />
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        style={{ display: 'none' }}
                        onChange={handleImageSelect}
                    />
                </div>
                <button
                    className="chat-send-btn"
                    onClick={() => sendMessage()}
                    disabled={loading || (!input.trim() && !imageFile)}
                    aria-label="Send message"
                    id="chat-send-button"
                >
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
}
