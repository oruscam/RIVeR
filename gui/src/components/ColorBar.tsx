import { COLORS } from "../constants/constants";

const colors = [
    COLORS.LIGHT_BLUE, // Light Blue - Lowest
    COLORS.GREEN, // Green - Low-mid
    COLORS.YELLOW, // Orange-Yellow - Mid-high
    COLORS.RED //Red-Orange - Highest
];

export const ColorBar = ({ min, max }: { min: number, max: number}) => {
    const gradient = `linear-gradient(to right, ${colors.join(",")})`;

    return (
        <div className="colorbar-container">
            <div className="colorbar" style={{ background: gradient }} />
            <div className="colorbar-labels">
                <span>{min.toFixed(2)}</span>
                <span>{max.toFixed(2)}</span>
            </div>
        </div>
    )
}