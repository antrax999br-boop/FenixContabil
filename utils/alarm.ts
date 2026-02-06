
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

export const playRobustAlarm = () => {
    stopAlarm(); // Ensure previous is stopped

    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        // Create Oscillator (Sound Wave)
        oscillator = audioCtx.createOscillator();
        gainNode = audioCtx.createGain();

        oscillator.type = 'sawtooth'; // Aggressive alarm tone
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
                oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
                isHigh = !isHigh;
            }
        }, 400);

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
