# Tahoe National Forest Hydro Dashboard

This project is a dashboard for monitoring hydro-meteorological data for the Tahoe National Forest. It includes scripts to fetch data and a Dash application to visualize it.

## Structure

*   `dashboard.py`: The main application script that runs the dashboard.
*   `fetch_data.py`: A script to fetch the latest data from CDEC and NWS and update the CSV files used by the dashboard.
*   `requirements.txt`: List of Python dependencies.
*   `archive/`: Directory containing older versions of scripts and experimental code.
*   `*.csv`: Data files used by the dashboard (`JBR_365.csv`, `GBR.csv`, `CSS.csv`, `forecast.csv`).

## Setup

1.  **Install Dependencies:**
    It is recommended to use a virtual environment.
    ```bash
    pip install -r requirements.txt
    ```

## Usage

### 1. Update Data
Run the data fetch script to get the latest streamflow, snow, and forecast data.
```bash
python fetch_data.py
```
*Note: This script requires an internet connection to reach `cdec.water.ca.gov` and `forecast.weather.gov`.*

### 2. Run Dashboard
Start the dashboard application.
```bash
python dashboard.py
```
Open your web browser and navigate to `http://127.0.0.1:8050/`.

## Future Work

*   **Live Updates:** Currently, the dashboard reads from static CSV files. To make it "live", `fetch_data.py` could be integrated into `dashboard.py` to run on a schedule or on app startup. Alternatively, `fetch_data.py` could be run via a cron job on a server.
*   **Webcam Integration:** The dashboard attempts to fetch a webcam image from Sugar Bowl. If the website structure changes, the image scraping logic in `dashboard.py` might need updating.

## Note on Archived Files
The `archive/` folder contains previous iterations of the scripts (`figure_building.py`, `figures_no_pull.py`, etc.). These are kept for reference but are not used by the main application.
