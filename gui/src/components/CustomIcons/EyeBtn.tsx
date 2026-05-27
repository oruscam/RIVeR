import { useRipple } from "./useRipple";
import { Icons } from "./Icons";

interface EyeProps {
    active: boolean;
    action: (index?: number) => void;
    index?: number;
    noBorder?: boolean;
}

export function EyeBtn({ action, index, active, noBorder }: EyeProps) {
    const [rpl, fire] = useRipple();

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        fire("var(--primary-text-color, #888)");
        action(index)
    }

    return (
        <button type="button" className={`ib ${active ? "" : ""}`}
            style={noBorder ? { borderColor: 'transparent' } : undefined}
            onClick={handleClick}>
            {rpl}
            <span className={`cl ${active ? "show" : "hide"}`}>{Icons.Eye("currentColor")}</span>
            <span className={`cl ${active ? "hide" : "show"}`}>{Icons.EyeOff("currentColor")}</span>
        </button>
    );
}
