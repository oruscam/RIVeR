const options = {
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    x: {
      title: {
        display: true,
        text: "Station",
        color: "rgba(255,255,255, 0.9)",
      },
      ticks: {
        maxTicksLimit: 6,
      },
      grid: {
        display: true,
        color: "rgba(255,255,255,0.1)",
      },
    },
    y: {
      title: {
        display: true,
        text: "Level",
        color: "rgba(255,255,255, 0.9)",
      },
      ticks: {
        maxTicksLimit: 6,
      },
      grid: {
        display: true,
        color: "rgba(255,255,255,0.1)",
      },
    },
  },
};

export default options;
