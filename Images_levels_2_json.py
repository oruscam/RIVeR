import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.image as mpimg
import os
import re
from datetime import datetime

# Paths
excel_path = "/Users/antoine/Downloads/Monitoramento com Camera 2/levels.xlsx"
image_folder = "/Users/antoine/Downloads/Monitoramento com Camera 2"

# --- Load Excel ---
df = pd.read_excel(excel_path)
df["Data/Hora"] = pd.to_datetime(df["Data/Hora"])  # ensure datetime

# --- Parse image filenames into datetimes ---
image_files = [f for f in os.listdir(image_folder) if f.lower().endswith((".jpg", ".png"))]

image_times = []
pattern = re.compile(r"(\d{4}\.\d{2}\.\d{2}_\d{2}\.\d{2}\.\d{2})")

for f in image_files:
    match = pattern.search(f)
    if match:
        t = datetime.strptime(match.group(1), "%Y.%m.%d_%H.%M.%S")
        image_times.append((t, f))

# Sort by time
image_times.sort(key=lambda x: x[0])

# --- Match each row in df to closest image time ---
def closest_image(dt):
    return min(image_times, key=lambda x: abs(x[0] - dt))[1]

df["Arquivo associado"] = df["Data/Hora"].apply(closest_image)

# --- Add coordinate columns ---
df["X"] = None
df["Y"] = None

# --- Iterate over rows ---
for i, row in df.iterrows():
    level = row["JUSANTE"]
    img_file = row["Arquivo associado"]
    img_path = os.path.join(image_folder, img_file)

    if not os.path.exists(img_path):
        print(f"⚠️ File not found for row {i}: {img_file}")
        continue

    print(f"\n=== Row {i} ===")
    print(f"Data/Hora: {row['Data/Hora']} | Nível: {level}")
    print(f"Abrindo imagem: {img_file}")

    img = mpimg.imread(img_path)
    fig, ax = plt.subplots()
    ax.imshow(img)
    ax.set_title(f"{row['Data/Hora']} | Nivel: {level}")
    ax.axis("off")

    # Plot previously selected points with labels
    prev_points = df.loc[:i-1, ["X", "Y", "JUSANTE"]].dropna()
    if not prev_points.empty:
        ax.plot(prev_points["X"], prev_points["Y"], "rx")
        for _, p in prev_points.iterrows():
            ax.text(
                p["X"] + 5,  # small shift to the right
                p["Y"],
                str(p["JUSANTE"]),
                fontsize=6,
                color="red",
                va="center",
                ha="left"
            )

    print("🔍 Use toolbar to zoom/pan, then press ENTER in the figure window to select a point...")

    # Wait until ENTER is pressed
    plt.waitforbuttonpress()  # blocks until key pressed (ENTER, space, etc.)

    # Now enable ginput
    pts = plt.ginput(1, timeout=-1)  # next click = your point
    if pts:
        x, y = pts[0]
        df.loc[i, "X"] = x
        df.loc[i, "Y"] = y
        ax.plot(x, y, "rx")
        ax.text(
            x + 5,
            y,
            str(level),
            fontsize=6,
            color="red",
            va="center",
            ha="left"
        )
        fig.canvas.draw()
    else:
        print("⚠️ No point selected, skipping...")

    plt.show(block=False)
    plt.pause(1)
    plt.close(fig)

# --- Save updated dataframe ---
output_excel = "/Users/antoine/Downloads/Monitoramento com Camera 2/levels_with_coords.xlsx"
df.to_excel(output_excel, index=False)
print(f"\n✅ All done! Results saved to: {output_excel}")



import json

# Split dataframe
df_scale1 = df.iloc[:3]   # first 3 points
df_scale2 = df.iloc[3:]   # the rest

# Build JSON structure
data_json = {
    "levels": {
        "scale1": df_scale1["JUSANTE"].dropna().tolist(),
        "scale2": df_scale2["JUSANTE"].dropna().tolist()
    },
    "coordinates": {
        "scale1": df_scale1[["X", "Y"]].dropna().values.tolist(),
        "scale2": df_scale2[["X", "Y"]].dropna().values.tolist()
    }
}

# Save JSON file
output_json = "/Users/antoine/Downloads/Monitoramento com Camera 2/levels_with_coords.json"
with open(output_json, "w", encoding="utf-8") as f:
    json.dump(data_json, f, indent=4, ensure_ascii=False)

print(f"✅ JSON file saved to: {output_json}")
