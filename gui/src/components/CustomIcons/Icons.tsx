// src/components/CustomIcons/Icons.tsx

import React from 'react';

/* ─── INLINE SVG ICONS (Lucide paths, no library needed) ─── */
interface IProps {
    d: string;
    size?: number;
    color?: string;
    extra?: string[];
}

const I: React.FC<IProps> = ({ d, size = 21, color = "currentColor", extra = [] }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {[d, ...extra].map((path, i) => <path key={i} d={path} />)}
    </svg>
);

export const Icons = {
    Eye: (c?: string) => <I color={c} d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" extra={["M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"]} />,
    EyeOff: (c?: string) => <I color={c} d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" extra={["M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19", "M1 1l22 22", "M10.73 10.73a3 3 0 0 0 4.2 4.2"]} />,
    Lock: (c?: string) => <I color={c} d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z" extra={["M7 11V7a5 5 0 0 1 10 0v4"]} />,
    Unlock: (c?: string) => <I color={c} d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z" extra={["M7 11V7a5 5 0 0 1 9.9-1"]} />,
    Copy: (c?: string) => <I color={c} d="M8 17.929H6c-1.105 0-2-.912-2-2.036V5.036C4 3.91 4.895 3 6 3h8c1.105 0 2 .911 2 2.036v1.866" extra={["M18 21H10a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2z"]} />,
    Check: (c?: string) => <I color={c} d="M20 6L9 17l-5-5" />,
    Trash: (c?: string) => <I color={c} d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />,
    BoxSel: (c?: string) => <svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3H3v2" /><path d="M19 3h2v2" /><path d="M5 21H3v-2" /><path d="M19 21h2v-2" /><path strokeDasharray="3 3" d="M3 9v6M21 9v6M9 3h6M9 21h6" /></svg>,
    Pincel: (c?: string) => <I color={c} d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" extra={["m15 5 4 4"]} />,
    PincelCrossed: (c?: string) => <I color={c} d="m10 10-6.157 6.162a2 2 0 0 0-.5.833l-1.322 4.36a.5.5 0 0 0 .622.624l4.358-1.323a2 2 0 0 0 .83-.5L14 13.982" extra={["m12.829 7.172 4.359-4.346a1 1 0 1 1 3.986 3.986l-4.353 4.353", "m2 2 20 20"]} />,
    Globe: (c?: string) => <I color={c} d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" extra={["M2 12h20", "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"]} />,
    Settings: (c?: string) => <I color={c} d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" extra={["M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"]} />,
    ChevDown: (c?: string, rot?: number) => <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `rotate(${rot || 0}deg)`, transition: "transform .2s" }}><path d="M6 9l6 6 6-6" /></svg>,
    Play: (c?: string) => <I color={c} d="M5 3l14 9-14 9V3z" />,
    Pause: (c?: string) => <I color={c} d="M6 4h4v16H6zM14 4h4v16h-4z" />,
    Video: (c?: string) => <I color={c} d="m22 8-6 4 6 4V8Z" extra={["M4 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"]} />,
    Loader: (c?: string) => <svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /><line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" /></svg>,
    Download: (c?: string) => <I color={c} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />,
    FrameBack: (c?: string) => <I color={c} d="M17 18l-6-6 6-6" extra={["M7 6v12"]} />,
    FrameNext: (c?: string) => <I color={c} d="M7 18l6-6-6-6" extra={["M17 6v12"]} />,
    SoundOn: (c?: string) => <I color={c} d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" extra={["M16 9a5 5 0 0 1 0 6", "M19.364 18.364a9 9 0 0 0 0-12.728"]} />,
    SoundOff: (c?: string) => <I color={c} d="M16 9a5 5 0 0 1 .95 2.293" extra={["M19.364 5.636a9 9 0 0 1 1.889 9.96", "m2 2 20 20", "m7 7-.587.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298V11", "M9.828 4.172A.686.686 0 0 1 11 4.657v.686"]} />,
    Sun: (color?: string) => (
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
        </svg>
    ),
    Moon: (c?: string) => <I color={c} d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />,
    MaskAdd: (color: string) => (
        <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            {/* La caja punteada (dejando espacio libre abajo a la derecha) */}
            <path d="M4 4h4" strokeDasharray="4 4" />
            <path d="M10 4h10v6" strokeDasharray="4 4" />
            <path d="M4 10v10h6" strokeDasharray="4 4" />
            <path d="M4 6v2" strokeDasharray="4 4" />

            {/* El signo "+" en la esquina inferior derecha */}
            <line x1="15" y1="19" x2="21" y2="19" />
            <line x1="18" y1="16" x2="18" y2="22" />
        </svg>
    ),
    Dracula: (color?: string) => (
        <svg width="21" height="21" viewBox="0 0 22.4 19.3" fill="none" stroke={color || "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <g>
                <polyline points="14.7 9.1 13.2 9.1 13.2 9.7"/>
                <line x1="13.2" y1="12.4" x2="11.1" y2="12.4"/>
                <line x1="12.7" y1="14.2" x2="12.7" y2="12.4"/>
                <path d="M11.2.5c6,0,7.5,7.6,7.5,7.6,0,0-2.8-7.1-7.5-1.8"/>
                <path d="M18.7,8.1s3.1-.7,3.2,1.9-3.2,3-3.2,3"/>
                <path d="M18.7,11s-.8,7.8-7.5,7.8"/>
            </g>
            <g>
                <polyline points="7.7 9.1 9.2 9.1 9.2 9.7"/>
                <line x1="9.2" y1="12.4" x2="11.3" y2="12.4"/>
                <line x1="9.7" y1="14.2" x2="9.7" y2="12.4"/>
                <path d="M11.2.5c-6,0-7.5,7.6-7.5,7.6,0,0,2.8-7.1,7.5-1.8"/>
                <path d="M3.7,8.1s-3.1-.7-3.2,1.9c0,2.6,3.2,3,3.2,3"/>
                <path d="M3.7,11s.8,7.8,7.5,7.8"/>
            </g>
        </svg>
    ),
};
