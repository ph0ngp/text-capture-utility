import React, { useState, useEffect, useRef } from 'react'

// Type the presets so they are { x: number; y: number; width: number; height: number }
const PRESETS: Record<
    string,
    { x: number; y: number; width: number; height: number }
> = {
    macbook: { x: 250, y: 980, width: 1200, height: 137 },
    '4k': { x: 1000, y: 1735, width: 1850, height: 195 },
}

export default function App() {
    // Default to macbook preset
    const [x, setX] = useState<number>(PRESETS.macbook.x)
    const [y, setY] = useState<number>(PRESETS.macbook.y)
    const [w, setW] = useState<number>(PRESETS.macbook.width)
    const [h, setH] = useState<number>(PRESETS.macbook.height)

    const [autoSubtitleOn, setAutoSubtitleOn] = useState(false)
    const [latestText, setLatestText] = useState('')
    const [autoSubtitleText, setAutoSubtitleText] = useState('')

    // A ref to always hold the latest `autoSubtitleOn` value
    const autoSubtitleOnRef = useRef(autoSubtitleOn)

    // Whenever autoSubtitleOn changes, sync the ref
    useEffect(() => {
        autoSubtitleOnRef.current = autoSubtitleOn
    }, [autoSubtitleOn])

    // SSE setup
    useEffect(() => {
        const eventSource = new EventSource('http://localhost:3000/api/sse')
        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                if (data.desktopOCR) setLatestText(data.desktopOCR)
                // If we received auto-subtitle text...
                if (data.autoSubtitle) {
                    // Only update state if auto-subtitle is actually on right now. So that after we turn it off, it clears and doesn't show the latest text.
                    if (autoSubtitleOnRef.current) {
                        setAutoSubtitleText(data.autoSubtitle)
                    }
                }
            } catch (err) {
                console.error('Failed to parse SSE event:', err)
            }
        }
        eventSource.onerror = (error) => {
            console.error('SSE error:', error)
        }
        return () => {
            eventSource.close()
        }
    }, [])

    // Toggle auto-subtitle
    const toggleAutoSubtitle = async () => {
        const newState = !autoSubtitleOn
        setAutoSubtitleOn(newState)

        // If we're turning OFF auto subtitle
        if (!newState) {
            // Clear the auto subtitle text
            setAutoSubtitleText('')
        }

        try {
            await fetch('http://localhost:3000/api/auto-subtitle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    on: newState,
                    x,
                    y,
                    width: w,
                    height: h,
                }),
            })
        } catch (err) {
            console.error('Failed to toggle auto-subtitle:', err)
        }
    }

    // Handle preset selection
    // CY: All coordinates change only apply when we press "Turn ON Auto Subtitle"
    const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selected = e.target.value as keyof typeof PRESETS // "macbook" | "4k"
        const preset = PRESETS[selected]
        setX(preset.x)
        setY(preset.y)
        setW(preset.width)
        setH(preset.height)
    }

    // Clear the latest OCR text
    const clearLatestText = () => {
        setLatestText('')
    }

    return (
        <div>
            <pre className="reader_class">{latestText}</pre>

            {/* Auto-subtitle controls in a single horizontal line */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1rem',
                    marginTop: '1rem',
                }}
            >
                <button onClick={clearLatestText}>Clear</button>
                {/* Preset dropdown */}
                <label>
                    Preset:
                    <select
                        onChange={handlePresetChange}
                        style={{ marginLeft: '0.5rem' }}
                        defaultValue="macbook"
                    >
                        <option value="macbook">MacBook Movie</option>
                        <option value="4k">4K Movie</option>
                    </select>
                </label>

                <label>
                    X:
                    <input
                        type="number"
                        value={x}
                        onChange={(e) => setX(Number(e.target.value))}
                        style={{ marginLeft: '0.5rem', width: '5rem' }}
                    />
                </label>
                <label>
                    Y:
                    <input
                        type="number"
                        value={y}
                        onChange={(e) => setY(Number(e.target.value))}
                        style={{ marginLeft: '0.5rem', width: '5rem' }}
                    />
                </label>
                <label>
                    Width:
                    <input
                        type="number"
                        value={w}
                        onChange={(e) => setW(Number(e.target.value))}
                        style={{ marginLeft: '0.5rem', width: '5rem' }}
                    />
                </label>
                <label>
                    Height:
                    <input
                        type="number"
                        value={h}
                        onChange={(e) => setH(Number(e.target.value))}
                        style={{ marginLeft: '0.5rem', width: '5rem' }}
                    />
                </label>

                <button onClick={toggleAutoSubtitle}>
                    {autoSubtitleOn
                        ? 'Turn OFF Auto Subtitle'
                        : 'Turn ON Auto Subtitle'}
                </button>
            </div>

            <pre className="reader_class">{autoSubtitleText}</pre>
        </div>
    )
}
