import { COLORS } from "../constants/constants";
import { QuiverData } from "../helpers/drawVectorsFunctions";

const colors = [
    COLORS.LIGHT_BLUE, // Light Blue - Lowest
    COLORS.GREEN, // Green - Low-mid
    COLORS.YELLOW, // Orange-Yellow - Mid-high
    COLORS.RED //Red-Orange - Highest
];

export const ColorBar = ({ data }: { data: QuiverData[]}) => {
    const gradient = `linear-gradient(to right, ${colors.join(",")})`;

    const velocities = data.map(d => d.velocity);
    const min = velocities.length > 0 ? Math.min(...velocities).toFixed(2) : 0;
    const max = velocities.length > 0 ? Math.max(...velocities).toFixed(2) : 0;

    return (
        <div className="colorbar-container">
            <div className="colorbar" style={{ background: gradient }} />
            <div className="colorbar-labels">
                <span>{min}</span>
                <span>{max}</span>
            </div>
        </div>
    )
}