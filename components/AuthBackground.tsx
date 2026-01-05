'use client';

export default function AuthBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden">
            {/* Base gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900" />

            {/* Emerald glow overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-emerald-900/30 to-teal-900/40" />

            {/* Glowing orbs */}
            <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-teal-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

            {/* Floating particles */}
            {[...Array(15)].map((_, i) => (
                <div
                    key={i}
                    className="absolute w-1 h-1 bg-emerald-400 rounded-full animate-float"
                    style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 5}s`,
                        animationDuration: `${3 + Math.random() * 4}s`,
                        opacity: 0.3 + Math.random() * 0.4
                    }}
                />
            ))}

            {/* Network nodes and connections */}
            <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                {/* Connection lines */}
                <g stroke="rgb(16, 185, 129)" strokeWidth="1" opacity="0.2">
                    <line x1="20%" y1="30%" x2="40%" y2="50%" />
                    <line x1="40%" y1="50%" x2="60%" y2="40%" />
                    <line x1="60%" y1="40%" x2="80%" y2="60%" />
                    <line x1="30%" y1="70%" x2="50%" y2="80%" />
                    <line x1="50%" y1="20%" x2="70%" y2="35%" />
                </g>

                {/* Glowing nodes */}
                {[
                    { x: '20%', y: '30%' },
                    { x: '40%', y: '50%' },
                    { x: '60%', y: '40%' },
                    { x: '80%', y: '60%' },
                    { x: '30%', y: '70%' }
                ].map((pos, i) => (
                    <g key={i}>
                        <circle
                            cx={pos.x}
                            cy={pos.y}
                            r="6"
                            fill="rgb(16, 185, 129)"
                            opacity="0.3"
                            className="animate-pulse"
                            style={{ animationDelay: `${i * 0.3}s` }}
                        />
                        <circle
                            cx={pos.x}
                            cy={pos.y}
                            r="3"
                            fill="rgb(52, 211, 153)"
                            opacity="0.6"
                        />
                    </g>
                ))}
            </svg>

            {/* Dollar signs - floating subtly */}
            {[
                { x: '10%', y: '15%', size: '28' },
                { x: '88%', y: '20%', size: '24' },
                { x: '82%', y: '78%', size: '26' },
                { x: '15%', y: '82%', size: '22' }
            ].map((dollar, i) => (
                <div
                    key={i}
                    className="absolute text-emerald-500/10 font-bold animate-float"
                    style={{
                        left: dollar.x,
                        top: dollar.y,
                        fontSize: `${dollar.size}px`,
                        animationDelay: `${i * 1.5}s`,
                        animationDuration: '8s'
                    }}
                >
                    $
                </div>
            ))}

            {/* Rising trend arrow */}
            <svg className="absolute top-1/4 right-1/5 opacity-12 animate-pulse" width="90" height="55" xmlns="http://www.w3.org/2000/svg" style={{ animationDuration: '3s' }}>
                <polyline
                    points="10,45 25,35 45,22 65,12 80,5"
                    fill="none"
                    stroke="rgb(16, 185, 129)"
                    strokeWidth="2"
                />
                <polygon points="80,5 75,12 85,10" fill="rgb(16, 185, 129)" />
                <circle cx="25" cy="35" r="2.5" fill="rgb(52, 211, 153)" />
                <circle cx="45" cy="22" r="2.5" fill="rgb(52, 211, 153)" />
                <circle cx="65" cy="12" r="2.5" fill="rgb(52, 211, 153)" />
            </svg>

            {/* Security shield */}
            <svg className="absolute bottom-1/4 right-12 opacity-10" width="45" height="55" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M 22.5 5 L 40 13 L 40 28 Q 40 45 22.5 50 Q 5 45 5 28 L 5 13 Z"
                    fill="none"
                    stroke="rgb(16, 185, 129)"
                    strokeWidth="1.5"
                />
                <polyline points="13,28 19,34 32,21" fill="none" stroke="rgb(52, 211, 153)" strokeWidth="1.5" />
            </svg>

            {/* Light rays - very subtle */}
            <div className="absolute inset-0 overflow-hidden opacity-5">
                <div
                    className="absolute w-1 h-full bg-gradient-to-b from-transparent via-emerald-400 to-transparent blur-sm"
                    style={{
                        left: '15%',
                        transform: 'rotate(15deg)',
                        transformOrigin: 'top'
                    }}
                />
                <div
                    className="absolute w-1 h-full bg-gradient-to-b from-transparent via-teal-400 to-transparent blur-sm"
                    style={{
                        right: '20%',
                        transform: 'rotate(-12deg)',
                        transformOrigin: 'top'
                    }}
                />
            </div>
        </div>
    );
}
