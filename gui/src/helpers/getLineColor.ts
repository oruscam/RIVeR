import { COLORS } from "../constants/constants";

const getLineColor = (index: number) => {
  const { D12, D23, D34, D14 } = COLORS.CONTROL_POINTS;

  switch (index) {
    case 0:
      return D12;
    case 1:
      return D23;
    case 2:
      return D34;
    case 3:
      return D14;

    default:
      return "black";
  }
};

export default getLineColor;
