
// Audio Context Singleton
let audioCtx: AudioContext | null = null;
let oscillator: OscillatorNode | null = null;
let gainNode: GainNode | null = null;
let alarmInterval: any = null;

const stopAlarm = () => {
    if (oscillator) {
        try { oscillator.stop(); } catch (e) { }
        oscillator.disconnect();
        oscillator = null;
    }
    if (gainNode) {
        gainNode.disconnect();
        gainNode = null;
    }
    if (alarmInterval) {
        clearInterval(alarmInterval);
        alarmInterval = null;
    }
};

export const playRobustAlarm = (volume: number = 0.5) => {
    stopAlarm(); // Ensure previous is stopped

    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        // Create Oscillator (Sound Wave)
        oscillator = audioCtx.createOscillator();
        gainNode = audioCtx.createGain();

        // Apply volume with a softer scaling (0.2x multiplier)
        // This makes 100% in UI equal to a safe 20% in system gain
        const scaledVolume = volume * 0.2;
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(scaledVolume, audioCtx.currentTime + 0.1);

        oscillator.type = 'triangle'; // Softer than sawtooth but still audible
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);

        // Connect
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();

        // Pulse Effect (Siren)
        let isHigh = true;
        alarmInterval = setInterval(() => {
            if (oscillator && audioCtx) {
                const freq = isHigh ? 800 : 600;
                // Smooth frequency transition
                oscillator.frequency.exponentialRampToValueAtTime(freq, audioCtx.currentTime + 0.1);
                isHigh = !isHigh;
            }
        }, 500);

    } catch (e) {
        console.error("Web Audio API Error:", e);
    }
};

export const stopRobustAlarm = () => {
    stopAlarm();
    if (audioCtx) {
        audioCtx.close().then(() => { audioCtx = null; });
    }
};
