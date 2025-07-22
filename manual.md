<div align="center">
  <img src="https://raw.githubusercontent.com/oruscam/RIVeR/main/river/docs/_static/river_logo.svg" width="350px">
  <br />
  <br />

  <p>
    <strong>Modern LSPIV toolkit for water-surface velocity analysis and flow discharge measurements</strong>
</div>

# RIVeR GUI Manual

## Introduction

**RIVeR** (Rectification of Image Velocity Results) is a modern, open-source toolkit for Large Scale Particle Image Velocimetry (**LSPIV**) developed by [ORUS](https://orus.cam/). It allows you to analyze water-surface velocities and estimate flow discharge from video footage using an intuitive graphical interface.

RIVeR is designed for:
- **Beginners**: offering default settings and guided steps.
- **Advanced users**: providing advanced parameter controls and customizable analysis.

While RIVeR also provides a CLI (Command-Line Interface) for automation and scripting, this manual focuses only on the **Graphical User Interface (GUI)**.

Key GUI features:
- Multi-source video processing (drones, oblique cameras, fixed stations)
- Interactive cross-section and ground reference point setup
- FFT-based multi-pass PIV analysis
- Real-time visualization and automated report generation
- Multi-language support (English, Spanish, French, Portuguese, Italian, German)

---

## Installation

You can install RIVeR using **precompiled standalone packages** for your operating system. No Python or developer tools are required.

| OS        | Package Type | Download Link                                                                                      |
|-----------|--------------|---------------------------------------------------------------------------------------------------|
| Windows   | `.exe`      | [RIVeR-Windows-3.1.0-Setup.exe](https://github.com/oruscam/RIVeR/releases/download/v3.1.0/RIVeR-Windows-3.1.0-Setup.exe) |
| macOS     | `.dmg`      | [RIVeR-Mac-3.1.0-Installer.dmg](https://github.com/oruscam/RIVeR/releases/download/v3.1.0/RIVeR-Mac-3.1.0-Installer.dmg) |
| Linux     | `.deb` / `.rpm` | [RIVeR-Linux-3.1.0.deb](https://github.com/oruscam/RIVeR/releases/download/v3.1.0/RIVeR-Linux-3.1.0.deb) / [RIVeR-Linux-3.1.0.rpm](https://github.com/oruscam/RIVeR/releases/download/v3.1.0/RIVeR-Linux-3.1.0.rpm) |

### Installation Steps

1. Download the installer for your OS.
2. Run the installer and follow the on-screen instructions.
3. Launch the application.

> 💡 **Note:**  
> If your OS blocks the app because it’s unsigned, allow it manually via your security settings.  
> **MacOS users:** check the discussion and workaround here → [GitHub Discussions #76](https://github.com/oruscam/RIVeR/discussions/76).
### 📚 Additional Resources

For a deeper understanding of LSPIV measurement techniques, rectification methods, and camera setup principles, refer to our official guidelines:

- [LSPIV Guidelines (English and Spanish)](https://github.com/oruscam/lspiv-guidelines/releases)

> 🛠 **Note:**  
> These guidelines were developed by our team to support general LSPIV measurements.  
> While not specific to RIVeR, they provide valuable background on the theoretical and technical concepts used behind the scenes in the software.

---
## Understanding the Interface

### 🏠 Home Screen

<figure>
    <img src="https://github.com/oruscam/RIVeR/blob/manual/river/docs/_static/00%20-%20Home.png?raw=true" width=500>
    <p><i>RIVeR 3.1.0 Home screen</i></p>
</figure>

When you open RIVeR, you arrive at the Home screen.

Here you can:

- **Start** → Begin a new project.
- **Load Project** → Open a previously saved project.
- **Check Version** → See the current installed version (shown at the bottom).
- **Select Language** → Change the interface language (bottom, globe icon).

This is the only screen with a single, centered layout.  
Once you start or load a project, the interface switches to the two-panel workflow view.

---

## Starting a New Project vs. Loading an Existing One

From the Home screen, you can choose:

- **Start** → Begin a new project from scratch.
- **Load Project** → Open a previously saved project.


### 📁 How Project Saving Works

Whenever you start a new project, RIVeR automatically saves your work in the background.

Saved projects are stored in:
/Users/username/river/`<video_name>`/`<timestamped_subfolder>`

- `<video_name>` → The name of the video file you are processing.
- `<timestamp>` → A folder named with the creation date and time, e.g., `20250718T1123` (YYYYMMDDTHHMM).

> 💡 **Example:**  
> `/Users/username/river/Suquia/20250718T1123/`

This structure allows you to **process the same video multiple times with different settings**, and each session will be saved in its own timestamped subfolder.

---

### 🔄 Loading an Existing Project

When you click **Load Project**, RIVeR will prompt you to select the folder of a previously saved project.

You must select the correct timestamped subfolder inside:
/Users/username/river/<video_name>/

Once loaded, you can continue the analysis, adjust settings, or directly export results.

> 💡 **Tip:** Use the “Load Project” option if you want to revisit past work, compare different settings, or avoid reprocessing.
---

## Select Kind of Footage

<figure>
    <img src="https://github.com/oruscam/RIVeR/blob/manual/river/docs/_static/01%20-%20Footage.png?raw=true" width=500>
    <p><i>Select the kind of footage to process</i></p>
</figure>

After clicking **Start** on the Home screen, you will be asked to select the type of footage you want to process.

You can choose between:

- **UAV (Drone icon, left)**  
  Aerial footage, typically an orthogonal (top-down) view of the water surface.  
  Assumes a simple pixel-to-real-world scaling, where pixels are uniformly sized.

- **Oblique View (Tripod icon, middle)**  
  Footage from a camera placed on a riverbank or tripod, showing the flow at an angle.  
  Requires perspective correction using vanishing points, as pixel sizes vary with distance.

- **Fixed Camera (Surveillance icon, right)**  
  Footage from a permanently installed, fixed-position camera for continuous monitoring.  
  Involves more complex rectification using camera calibration and detailed ground surveys.

Behind the scenes, this choice determines **how pixel coordinates will be related to real-world coordinates** (rectification).  
It defines whether a simple scale, a homography matrix, or a full camera matrix will be used to transform image measurements into physical units.

> 💡 **Note:**  
> From left to right, the options represent increasing complexity in topographic correction.  
> However, RIVeR allows flexibility — you can process any footage type, even if, for example, your drone footage was recorded with an oblique angle.

### 📂 Selecting the Video

Once you select the footage type, RIVeR will prompt you to **browse and select the video file** you want to process.
After selecting the video, you **must click “Next”** to continue to the next step.


> ⚙️ **Advanced context (for reference, not required to use RIVeR):**  
> Rectification methods in RIVeR rely on projective geometry concepts such as camera matrices and homography matrices.  
> The chosen method depends on the type of footage and available survey data, balancing simplicity and accuracy.

---

### 🔄 Navigation: Next and Back Buttons

From this point onward, the RIVeR interface will **always display “Next” and “Back” buttons** at the bottom of the screen.

- **Next** → Move forward to the next step.
- **Back** → Return to the previous step.

> 🔧 **Why this matters:**  
> RIVeR is designed so that users **cannot skip steps** by accident, and they can always go back to review or adjust settings before continuing.

This makes the workflow **linear but flexible**, ensuring all required information is set correctly before the final results and export.

## Define Video Range

<figure>
    <img src="https://github.com/oruscam/RIVeR/blob/manual/river/docs/_static/02%20-%20Video%20Range.png?raw=true" width=500>
    <p><i>Define the video range for frame extraction</i></p>
</figure>

From this step onward, the RIVeR interface is **always divided into two main parts**:

- **Left panel** → Video view and workspace.
- **Right panel** → Parameters, input fields, and controls.

At the top-right, you will see a **progress bar** showing your current position in the 7-step workflow, ending with the automatically generated discharge report.

---

### 💧 Reminder: How LSPIV Works

Before continuing, it’s important to understand that LSPIV (Large-Scale Particle Image Velocimetry) is based on the assumption that:

- There are visible **tracers** (like foam, bubbles, debris) moving on the water surface.
- These tracers travel at the **same speed as the surface water flow**.

⚠️ **Without visible tracers, velocity cannot be measured.**  
If tracers move too fast (making flow direction unclear) or too slow (where measurement error becomes proportionally large), the technique’s reliability decreases.

Most videos are recorded at **30 frames per second (fps)**, but this can vary.

---

### 🎬 How to Use This Step

At the **end of this step**, RIVeR will extract frames from the video to prepare them for processing.

- **Left panel (Video Player):**  
  Play ⏯️ / ⏸️ pause the video, move the cursor, preview frames.

- **Right panel (Video Range Settings):**
  - **Start / End** → Define the time range to process.
    - Enter time **in seconds** (e.g., `70` → converts to `01:10`).
    - Or directly as `MM:SS`.
    - Alternatively, move the player cursor and click **Start** or **End** — it will auto-fill the time fields.

  - **Frame Interval** → Set how often frames are extracted.
    - `1` → Use all frames.
    - `2` → Use every other frame, and so on.

> 🛠 **How to choose the frame interval:**  
> There is **no single correct value**.  
> - If tracer movement is **barely visible** (less than a pixel per frame), increase the interval to make displacement clearer.  
> - If tracer displacement is **too large between frames**, decrease the interval for better accuracy.  
> The goal is to achieve **a neat, visible displacement** of surface tracers between frames.
> - You can also **use ◀️ and  ▶️ arrow buttons** below the player to preview how tracers will move between frames with the chosen frame interval.


- **Below the Frame Interval field, video metadata:**
  - File name.
  - Total length.
  - Resolution.
  - FPS (frames per second).

---

### 🔒 Advanced Settings (Unlockable Features)

At the bottom right, you will see a **lock icon (🔒)**.

By default, RIVeR hides advanced options to keep the workflow smooth and beginner-friendly.  
However, advanced users can **unlock the lock** to access additional features.

For example, at the Video Range selection step, unlocking the lock reveals **frame extraction resolution options**:

<figure>
    <img src="https://github.com/oruscam/RIVeR/blob/manual/river/docs/_static/02lock%20-%20Video%20Range.png?raw=true" width=300>
    <p><i>Select frame extraction resolution (advanced option)</i></p>
</figure>

- LSPIV generally does **not** require ultra-high-resolution images.
- Even if your video was recorded in 4K or 8K, the default extraction resolution is typically **downscaled to Full HD (1920x1080)**.
- However, you are free to modify this if desired.

> ⚠️ **Keep in mind:**  
> Higher resolutions mean significantly **larger processing time and data size** — adjust with care.

---

### 🔄 Navigation: Next and Back Buttons

Remember, from this step onward, RIVeR **always shows “Next” and “Back” buttons** at the bottom.

- **Next** → Move forward.
- **Back** → Return to the previous step.

This lets you review or adjust settings anytime without skipping essential steps.

## Rectification Step (Depends on Footage Type)

After selecting the video range, the next screen will depend on the footage type you selected.  
This step defines how RIVeR transforms image measurements (in pixels) into real-world distances — a process called **rectification**.

---

### 📸 UAV / Drone — Pixel Size

<figure>
    <img src="https://github.com/oruscam/RIVeR/blob/manual/river/docs/_static/03%20-%20Pixel%20Size.png?raw=true" width=500>
    <p><i>Define pixel size for UAV/drone footage</i></p>
</figure>

For UAV footage (top-down view), the rectification workflow is simple:

- **Draw a reference line** on the image between two known points.
  - Click **Draw Line**, then go to the left panel and **click-drag between <span style="color:#6CD4FF;font-weight:bold;">Point 1</span> and <span style="color:#6CD4FF;font-weight:bold;">Point 2</span>**.
  - This defines the segment that will be used for scale.

- **Enter the real-world distance** (Line Length) between the two points.
  - RIVeR will automatically calculate the **pixel size** based on the drawn line.

> 💡 **Important tip:**  
> The two reference points do **not need to be exactly on the water surface** (they can be on a bridge, rock, or bank),  
> but their vertical position (**Z-coordinate**) should be as close as possible to the water surface elevation.  
> This ensures that the scale you apply matches the flow plane.

> 💡 **Shortcut for advanced users:**  
> If you already know the pixel size (e.g., from satellite imagery), you can **enter it directly** into the Pixel Size field without drawing a line.

- Click **Solve** to calculate the rectification parameters.

Once solved, the right panel will display a **real-world view with a scale**, confirming that the transformation has been computed.

#### 🔒 Advanced Settings

<figure>
    <img src="https://github.com/oruscam/RIVeR/blob/manual/river/docs/_static/03lock%20-%20Pixel%20Size.png?raw=true" width=300>
    <p><i>Unlock advanced settings to enter exact coordinates</i></p>
</figure>

If you unlock the **lock icon (🔒)**, you can manually enter:
- Exact real-world coordinates of <span style="color:#ED6B57;font-weight:bold;">Point 1</span> and <span style="color:#6CD4FF;font-weight:bold;">Point 2</span> (East/North).
- Exact pixel coordinates in the image (X/Y).

This offers full control for expert users who need precise calibration.

---

Once everything is set, click **Next** to continue to the common workflow.




---

### 📷 Oblique Camera — Control Points (Distances)

<figure>
    <img src="https://github.com/oruscam/RIVeR/blob/manual/river/docs/_static/03%20-%20Control%20Points%20(oblique).png?raw=true" width=500>
    <p><i>Define control points and distances (oblique camera)</i></p>
</figure>

For oblique views (e.g., from a riverbank), the rectification workflow involves selecting control points and defining their real-world distances.

- **Select at least four control points** on the image:
  - Click **Draw Points**, then go to the left panel.
  - Click and place **<span style="color:#ED6B57;font-weight:bold;">Point 1</span>** and **<span style="color:#6CD4FF;font-weight:bold;">Point 2</span>** manually.
  - **<span style="color:#6CD4FF;font-weight:bold;">Point 3</span>** and **<span style="color:#6CD4FF;font-weight:bold;">Point 4</span>** will appear automatically — you must position them manually.

> 💡 **Important tip:**  
> The control points do **not have to be on the water surface itself**,  
> but their vertical position (**Z-coordinate**) should be as close as possible to the water surface plane.  
> This ensures that the perspective correction applies accurately to the flow layer.

- **Point placement order:**
  - <span style="color:#ED6B57;font-weight:bold;">Point 1</span> → most left and upstream.
  - Follow counterclockwise: <span style="color:#6CD4FF;font-weight:bold;">Point 2</span>, <span style="color:#6CD4FF;font-weight:bold;">Point 3</span>, <span style="color:#6CD4FF;font-weight:bold;">Point 4</span>.
  - Use your mouse wheel to **zoom in/out** for precise placement.

- **Define the six real-world distances** between the points.
  - The system shows all six pairwise distances:
    - 1-2, 2-3, 3-4, 4-1, 1-3, 2-4.
  - Each distance is color-coded for easy identification.

- **Enter real-world distance values**:
  - Manually type them in on the right panel.
  - Or **import from Excel or text file** following the same order.

- **Solve the homography matrix**:
  - Click **Solve** to calculate the transformation.
  - RIVeR will correct for perspective distortion, ensuring accurate scaling even when pixel sizes vary with distance.

---

Once finished, click **Next** to continue to the shared workflow.


---

### 📹 Fixed Camera — Control Points (Coordinates)

<figure>
    <img src="https://github.com/oruscam/RIVeR/blob/manual/river/docs/_static/03%20-%20Control%20Points%20(fixed%20camera).png?raw=true" width=500>
    <p><i>Import control point coordinates (fixed camera)</i></p>
</figure>

For fixed camera setups, the workflow involves importing **ground control points (GCPs)** with known real-world coordinates and linking them to their pixel positions in the images.  
This enables RIVeR to compute a precise **camera calibration matrix** for rectification.

---

#### 🛠 Workflow steps

1️⃣ **Import real-world coordinates**
- Click **Import Points** and select a file (CSV, TXT) with at least four columns:
  - Label, East, North, Z
- Points must be **surveyed with GPS or total station**.
- Coordinates should be in **linear distance units** (e.g., meters, feet, UTM) — **not geographic coordinates** (latitude/longitude).
- Once imported:
  - The table on the right fills with the real-world coordinates.
  - A map below shows the point layout.

2️⃣ **Understand the table**
- The table shows:
  - Real-world coordinates: East, North, Z
  - Pixel coordinates (X, Y) — to be defined.
- The goal is to **associate each real-world point to its pixel location** in the images.
> 💡 **Alternative option:**  
> Instead of importing a 4-column file (Label, East, North, Z) and manually placing points,  
> you can also import a **6-column file** (Label, East, North, Z, x, y) where the real-world and pixel coordinates are already matched.  
> This skips the manual placement step and directly fills all required data.

3️⃣ **Import images**
- Click **Import Images** to load a folder of snapshots showing the surveyed points.
- ⚠️ **Important:**  
  The camera must **not have moved** during or after the survey.
- **Recommendation:**  
  For each point, capture a dedicated snapshot during the survey, and name the image to match the point label (e.g., `01.jpg` → `PTO 01`).  
  In the carousel (left panel), image names appear as a **gray watermark** on each thumbnail, helping you match images to points.

4️⃣ **Associate points to pixels**

<figure>
    <img src="https://github.com/oruscam/RIVeR/blob/manual/river/docs/_static/03%20-%20Control%20Points%20(fixed%20camera)%20-%20single%20point.png?raw=true" width=500>
    <p><i>Example: selecting and placing a control point</i></p>
</figure>

- Select an image in the carousel (displayed larger above).
- In the table, click the row (e.g., `PTO 01`).
- A **red pin** will appear on the image.
- Precisely place the pin where the point is located.  
  You can **zoom in/out** using the mouse wheel.
- The pixel coordinates (X, Y) will automatically update in the table.
- Repeat for all points until all are linked.

> 💡 **Important tip:**  
> The control points should **cover the entire image as much as possible**,  
> spanning a wide range of East, North, and elevation (Z) values.  
> Think of them as a **3D cloud of points** to properly constrain the calibration.  
> For robust results, **at least 10 well-distributed points** are recommended.

---

5️⃣ **Solve camera calibration**

<figure>
    <img src="https://github.com/oruscam/RIVeR/blob/manual/river/docs/_static/03%20-%20Control%20Points%20(fixed%20camera)%20-%20results.png?raw=true" width=500>
    <p><i>View after solving the camera matrix</i></p>
</figure>

- Once all points are placed, click **Direct Solve** to calculate the camera matrix.
- A **rectified image** will appear, showing the estimated camera position.
- On the left panel, you will see:
  - **Red markers** showing the reprojection of real-world points.
  - **Yellow ellipses** indicating uncertainty.

On the right panel, you will see:
- Mean **reprojection error** (e.g., in pixels).
- Number of points used for calibration.
- Estimated **camera height**.

You can also click **Optimize** to refine the camera matrix using only selected points, aiming to reduce the reprojection error.

---

Once you are satisfied with the results, click **Next** to continue to the common workflow.

## Define Cross Section(s)

<figure>
    <img src="https://github.com/oruscam/RIVeR/blob/manual/river/docs/_static/04%20-%20Cross%20Sections.png?raw=true" width=500>
    <p><i>Define one or more cross sections for discharge calculation</i></p>
</figure>

In this step, you define the **cross sections** where RIVeR will estimate discharge.  
You can define **one or multiple cross sections**, depending on the complexity and goals of your analysis.

---

<figure>
    <img src="https://github.com/oruscam/RIVeR/blob/manual/river/docs/_static/04%20-%20Cross%20Sections%20-%20tabs.png?raw=true" width=300>
    <p><i>Managing multiple cross sections via tabs</i></p>
</figure>

- To **add a new cross section**, click the **`✚` tab**.
- To **remove a cross section**, click the **`ˣ`** that appears next to its name.
- You can **rename any cross section** by clicking on its name.
- Use the **eye icon** to toggle visibility between the currently selected cross section and all defined cross sections.

---

### 🛠 How to define a cross section

1️⃣ **Draw cross section direction**
- Click the **Draw Direction** button.
- On the image (left panel), **click and drag a line from the left bank to the right bank**.
  - The **starting point (left)** will appear <span style="color:#ED6B57; font-weight:bold;">red</span>.
  - The **ending point (right)** will appear <span style="color:#62C655; font-weight:bold;">green</span>.

> ⚠️ **Important:**  
  This line defines the **orientation** of the cross section — it does not define its width.

2️⃣ **Import bathymetry**
- Click **Import bath** to load the bathymetric profile for the selected section.
- The file must be a text or Excel file with **two columns**:
  - **Distance from the left bank** (station)
  - **Either stage (level)** or **depth** at that location

> 💡 RIVeR will automatically detect if the second column represents **depth or stage**.  
> If it's depth, the profile is **inverted** to transform it into a level-based elevation profile.

- The imported profile is shown on the right as a stage vs. station plot.

3️⃣ **Enter water surface level (stage)**
- Fill in the **Level** field with the height of the water surface at the moment the video was recorded.

4️⃣ **Cross section geometry**
- The red and green pins on the image define the direction of the cross section and are **projected onto the bathymetry plot**.
- RIVeR uses the bathymetry and water level to calculate the **effective width** of the cross section.

- **Left Bank Station**:  
  By default, this value is `0`, meaning the red pin is assumed to be at the exact start of the cross section (station 0).

> 💡 If, in the field, you placed the red pin **slightly offset** from the true left bank (for example, using a stick or other object to define direction but not the actual bank edge),  
> you can use the **Left Bank Station** field to specify the distance between the **true left bank** and the **red pin location**.  
> This lets RIVeR correctly align the stationing of the bathymetry profile with the physical geometry of the river.

This is especially useful when the red pin is used as a reference marker for orientation but not for precise positioning at station 0.

---

### ✅ Quality check

To verify that everything is correctly aligned:
- In the bathymetry plot, the <span style="color:#ED6B57;">▼</span> and <span style="color:#62C655;">▼</span> represent the projected positions of the red and green pins.
- If the pins were placed on the river margins in the image, the triangles should align with the two edges of the bathymetry.
- This serves as a good visual check of whether **rectification, orientation, and stage matching** are consistent.

---

#### 🔒 Advanced Settings

<figure>
    <img src="https://github.com/oruscam/RIVeR/blob/manual/river/docs/_static/04lock%20-%20Cross%20Sections.png?raw=true" width=300>
    <p><i>Advanced settings: pin coordinates and Left Bank Station</i></p>
</figure>

If you unlock the **lock icon (🔒)**, you will see:

- **Real-world coordinates** (East/North) for both <span style="color:#ED6B57;font-weight:bold;">red</span> (left) and <span style="color:#62C655;font-weight:bold;">green</span> (right) pins.
- **Pixel coordinates** (X/Y) for both <span style="color:#ED6B57;font-weight:bold;">red</span> (left) and <span style="color:#62C655;font-weight:bold;">green</span> (right) pins.

---

Once the section is fully defined and checked, click **Next** to proceed to the PIV parameter settings.

## Define PIV Parameters

<figure>
    <img src="https://github.com/oruscam/RIVeR/blob/manual/river/docs/_static/05%20-Processing.png?raw=true" width=500>
    <p><i>Test and adjust PIV settings before full processing</i></p>
</figure>

In this step, you define the **PIV (Particle Image Velocimetry) analysis parameters**.  
This is where you test how well the algorithm tracks surface tracers **before applying it to all frames**.

---

### 🖼️ What is the ROI?

RIVeR does not process the entire image frame — it focuses only on the **Region of Interest (ROI)**, which is a rectangular area around the defined cross section.

- The **width** of the ROI is determined automatically based on the length of the cross section.
- The **height** is also computed by default but can be adjusted by advanced users.

This strategy greatly **reduces processing time** by ignoring areas irrelevant to the flow measurement.

---

### 🧪 Test your settings

- Click the **Test** button to run the PIV algorithm on a **pair of frames** selected from the **carousel at the bottom** (left panel).
- All extracted frames from the video are shown in this carousel. You can choose any frame pair to preview results.
- The resulting velocity vectors will appear over the image (left panel), so you can visually check their quality and consistency.

> 💡 The goal here is to preview and validate the configuration — not to process the whole video yet.

> 🔁 **Tip:**  
> A good way to test if the parameters are appropriate is to try several different frame pairs with the **same settings**.  
> If the vectors point in the **expected direction** and appear consistent across various flow conditions,  
> it's a strong indication that your settings are appropriate.

> ✅ You may also simply use the **default parameters**. They often provide a good starting point for many typical field recordings.

---

### 🧮 Understanding Window Sizes

RIVeR uses a two-pass FFT-based PIV algorithm, with **50% overlap** in both horizontal and vertical directions across the ROI.

- **Step 1 window size:**  
  This defines the size of the interrogation windows during the first pass.  
  It captures general displacement patterns across the ROI using cross-correlation in the frequency domain (FFT).

- **Step 2 window size:**  
  During the second pass, each interrogation window is **deformed** based on the velocity field estimated from Step 1.  
  This helps refine the displacement calculation, improving sub-pixel accuracy and better resolving gradients.

> ⚠️ A typical combination might be `128 → 64` or `64 → 32`,  
> but optimal values depend on tracer size, flow speed, and image resolution.

---

### 🧹 Filtering Options

<figure>
    <img src="https://github.com/oruscam/RIVeR/blob/manual/river/docs/_static/05lock%20-Processing.png?raw=true" width=300>
    <p><i>Advanced settings (visible after unlocking)</i></p>
</figure>

When you unlock the **lock icon (🔒)**, you can access various **advanced settings**. These are grouped into:

---

#### 🧼 Pre-processing Filters

These are applied **before** PIV analysis to improve image contrast and reduce noise.

- **Remove Background:**  
  Subtracts static patterns and enhances moving elements (e.g., tracers).

- **CLAHE (Contrast Limited Adaptive Histogram Equalization):**  
  Enhances local contrast for better tracer visibility.  
  - **Clip Limit:** Controls the strength of contrast enhancement. Higher = stronger.

---

#### 🧪 Post-processing Filters

These are applied **after** velocity fields are computed, to remove outliers based on neighboring vectors.

- **Std Filtering (Standard Deviation Filter):**  
  Removes vectors that deviate significantly from their neighbors, based on a standard deviation **Threshold**.

- **Median Test Filtering:**  
  Removes vectors that differ from the median of nearby vectors.  
  - **Epsilon:** Acceptable deviation.
  - **Threshold:** Filtering tolerance.

---

#### 📐 ROI Height

- **ROI Height** controls the vertical size (in pixels) of the Region of Interest.
- It is **automatically calculated** based on the Step 1 window size to ensure efficient coverage above and below the cross section.
- If needed, advanced users can **manually adjust the ROI height** by unlocking the panel.

> 💡 Adjusting the ROI may help in cases where the automatically defined region is too small or unnecessarily large, affecting processing time or missing relevant flow.

---

Once you're happy with the test results, click **Next** to proceed to full PIV processing.

