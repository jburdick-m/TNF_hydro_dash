# -*- coding: utf-8 -*-
"""
Updated Data Fetch Script
Original Author: jburdick
Refactored by: Jules (AI Agent)
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from scipy import signal
import ssl
import os
import requests
from bs4 import BeautifulSoup as bs
import xml.etree.ElementTree as ET

# Disable SSL verification for CDEC calls (legacy support)
ssl._create_default_https_context = ssl._create_unverified_context

def calculate_quantiles(df, value_col='flow'):
    """
    Calculates historical daily quantiles for shading.
    """
    df_quant = pd.DataFrame()
    # Create day of year for grouping
    # We need to handle leap years correctly, but simple dayofyear grouping is often sufficient for this type of plot
    day_groups = df.groupby(df['datetime'].dt.dayofyear)[value_col]

    df_quant['min'] = day_groups.min()
    df_quant['max'] = day_groups.max()
    df_quant['10'] = day_groups.quantile(.1)
    df_quant['25'] = day_groups.quantile(.25)
    df_quant['50'] = day_groups.quantile(.50)
    df_quant['75'] = day_groups.quantile(.75)
    df_quant['90'] = day_groups.quantile(.90)

    return df_quant

def process_station_data(url, station_id, output_filename, value_col_name='flow', days_back=180, is_snow=False):
    print(f"Fetching data for {station_id} from {url}...")
    try:
        dt1 = pd.read_csv(url,
                         parse_dates=['DATE TIME'],
                         na_values={'VALUE': ['NA']})

        # Standardize columns
        # Expected cols: STATION_ID, DATE TIME, VALUE
        cols = ['STATION_ID', 'DATE TIME', 'VALUE']
        df = dt1[cols].copy()
        df.columns = ['site', 'datetime', value_col_name]
        df[value_col_name] = pd.to_numeric(df[value_col_name], errors='coerce')

        # Filter for recent data for the main line
        recent_cutoff = datetime.now() - pd.to_timedelta(f"{days_back}day")
        df_recent = df[df.datetime > recent_cutoff].copy()

        # Calculate historical stats using the full dataset
        print(f"Calculating historical stats for {station_id}...")
        df_quant = calculate_quantiles(df, value_col_name)

        # Map stats back to the recent data based on day of year
        df_recent['dayofyear'] = df_recent['datetime'].dt.dayofyear

        # Initialize columns
        for q in ['min', 'max', '10', '25', '50', '75', '90']:
            df_recent[q] = np.nan

        for i in df_recent.index:
            doy = df_recent.loc[i, 'dayofyear']
            if doy in df_quant.index:
                for q in ['min', 'max', '10', '25', '50', '75', '90']:
                    df_recent.loc[i, q] = df_quant.loc[doy, q]

        # Save to CSV
        print(f"Saving {output_filename}...")
        # Old path: C:\Users\jburdick\Box\01. jacob.burdick Workspace\Documents\TNF dashboard\JBR_365.csv (for JBR)
        # Old path: C:\Users\jburdick\Box\01. jacob.burdick Workspace\Documents\TNF dashboard\GBR.csv (for GBR)
        # Old path: C:\Users\jburdick\Box\01. jacob.burdick Workspace\Documents\TNF dashboard\PT_SWE.csv (for CSSL/PT)

        df_recent.to_csv(output_filename)
        print(f"Successfully saved {output_filename}")

    except Exception as e:
        print(f"Error processing {station_id}: {e}")

# ____________________________________________________________________________________________________________________________________________________________________________________
# 1. Streamflow: Jones Bar (JBR)
# ____________________________________________________________________________________________________________________________________________________________________________________

url_jbr = 'https://cdec.water.ca.gov/dynamicapp/req/CSVDataServlet?Stations=JBR&SensorNums=20&dur_code=H&Start=1998-06-18T12%3A00&End=' + datetime.now().strftime('%Y-%m-%dT%H:%M')
process_station_data(url_jbr, 'JBR', 'JBR_365.csv', value_col_name='flow', days_back=180)


# ____________________________________________________________________________________________________________________________________________________________________________________
# 2. Streamflow: Goodyears Bar (GYB)
# ____________________________________________________________________________________________________________________________________________________________________________________

# Start date for GYB seems to be 2008 in original script
url_gyb = 'https://cdec.water.ca.gov/dynamicapp/req/CSVDataServlet?Stations=GYB&SensorNums=20&dur_code=E&Start=2008-08-01T00%3A00&End=' + datetime.now().strftime('%Y-%m-%dT%H:%M')
process_station_data(url_gyb, 'GYB', 'GBR.csv', value_col_name='flow', days_back=180)


# ____________________________________________________________________________________________________________________________________________________________________________________
# 3. Snow Water Equivalent: CSSL (CSL)
# ____________________________________________________________________________________________________________________________________________________________________________________

# Using CDEC CSL station (Central Sierra Snow Lab) as per legacy scripts, instead of manual Palisades Tahoe CSV
# This allows for automated updates.
url_csl = 'https://cdec.water.ca.gov/dynamicapp/req/CSVDataServlet?Stations=CSL&SensorNums=3&dur_code=D&Start=1908-10-15&End=' + datetime.now().strftime('%Y-%m-%d')
process_station_data(url_csl, 'CSL', 'CSS.csv', value_col_name='swe', days_back=365, is_snow=True)


# ____________________________________________________________________________________________________________________________________________________________________________________
# 4. Forecast: NWS
# ____________________________________________________________________________________________________________________________________________________________________________________

print("Fetching NWS Forecast...")
try:
    # Old path: C:\Users\jburdick\Box\01. jacob.burdick Workspace\Documents\TNF dashboard\file_nws.xml
    # Old working dir: os.chdir('C:\\Users\\jburdick\\Box\\01. jacob.burdick Workspace\\Documents\\TNF dashboard')

    forecast_url = 'https://forecast.weather.gov/MapClick.php?lat=39.1134&lon=-120.2417&FcstType=digitalDWML'
    response = requests.get(forecast_url)

    xml_filename = "file_nws.xml"
    with open(xml_filename, "w", encoding='utf-8') as file:
        file.write(str(bs(response.content, "lxml-xml").prettify()))

    tree = ET.parse(xml_filename)
    root = tree.getroot()

    # Parse Hourly QPF (Quantitative Precipitation Forecast)
    row_data = []
    # Depending on XML structure, finding parameters might vary.
    # Original script logic: root[1].find('parameters').find('hourly-qpf')
    # We will try to be robust.

    data_section = root.find('data')
    parameters = data_section.find('parameters')
    hourly_qpf = parameters.find('hourly-qpf')

    for value in hourly_qpf:
        if value.tag == 'value':
             row_data.append(value.text)

    # Parse Time Layout
    time_layout = data_section.find('time-layout')
    time_data = []
    for value in time_layout:
        if value.tag == 'start-valid-time':
            time_data.append(value.text)

    # Assuming the first time corresponds to the first QPF value
    # The original script had some complex splitting logic, likely because of how BS4 prettify formatted it or older XML structure
    # Standard NWS XML usually has ISO dates in time-layout

    if len(row_data) > 0 and len(time_data) >= len(row_data):
        df = pd.DataFrame()
        df['datetime'] = pd.to_datetime(time_data[:len(row_data)])
        df['qpf'] = pd.to_numeric(row_data, errors='coerce').fillna(0)

        # Calculate totals
        start_dt = df.iloc[0]['datetime']
        totals_df = pd.DataFrame(columns=['period', 'total_ppt'])

        periods = {
            '12 hours': 12,
            '24 hours': 24,
            '48 hours': 48,
            '72 hours': 72,
            '7 days': 24 * 7
        }

        for label, hours in periods.items():
            end_dt = start_dt + timedelta(hours=hours)
            total = df[(df['datetime'] >= start_dt) & (df['datetime'] < end_dt)]['qpf'].sum()
            totals_df = pd.concat([totals_df, pd.DataFrame({'period': [label], 'total_ppt': [total]})], ignore_index=True)

        # Save to CSV
        # Old path: C:\Users\jburdick\Box\01. jacob.burdick Workspace\Documents\TNF dashboard\forecast.csv
        totals_df.to_csv('forecast.csv', index=False)
        print("Successfully saved forecast.csv")

    else:
        print("Error: NWS data mismatch or empty.")

except Exception as e:
    print(f"Error fetching forecast: {e}")

print("Data update complete.")
