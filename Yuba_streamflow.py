# -*- coding: utf-8 -*-
"""
Created on Wed Nov 15 11:51:16 2023

@author: jburdick
"""
###
#####
#context plots. Returns water table elevations with historic ranges
#dataframe building

# -*- coding: utf-8 -*-
#import packages
# import os
# import shutil
import dash
import dash_core_components as dcc
import dash_html_components as html
import pandas as pd
import plotly.graph_objects as go
import numpy as np
import plotly.express as px
from plotly.subplots import make_subplots
import pathlib
from dash.dependencies import Input, Output
from datetime import datetime, timedelta
from scipy import signal
import ssl
import os
import getpass
import plotly as py
from plotly.offline import download_plotlyjs, init_notebook_mode,  plot
from FUNC_CDEC_PULL import FUNC_CDEC_PULL


ssl._create_default_https_context = ssl._create_unverified_context


# ____________________________________________________________
# ________________________________________________________________________________________________________________________
# ____________________________________________________________________________________________________________________________________________________________________________________
# Streamflow plot


#point to data locations

infile1 = 'https://cdec.water.ca.gov/dynamicapp/req/CSVDataServlet?Stations=JBR&SensorNums=20&dur_code=H&Start=1998-06-18T12%3A00&End=2023-11-15T12%3A00'
dt1 =pd.read_csv(infile1,
                 parse_dates = ['DATE TIME'],
                 na_values={
                       'VALUE':[
                               'NA']}
                 )
cols = list(dt1.columns)
cols = ['STATION_ID','DATE TIME', 'VALUE']
df = dt1[cols]
df.columns = ['site', 'datetime', 'flow']
df['flow'] = pd.to_numeric(df['flow'], errors='coerce')

JBR_365 = df[df.datetime > datetime.now() - pd.to_timedelta("180day")]     

#stats shading

df_quant = pd.DataFrame(columns = ['site','min', '10' , '25', '50', '75', '90', 'max'])
df_quant['min'] = df.groupby([df['datetime'].dt.dayofyear]).min()['flow']
df_quant['max'] = df.groupby([df['datetime'].dt.dayofyear]).max()['flow']
df_quant['10'] = df.groupby([df['datetime'].dt.dayofyear]).quantile(.1)['flow']
df_quant['25'] = df.groupby([df['datetime'].dt.dayofyear]).quantile(.25)['flow']
df_quant['50']= df.groupby([df['datetime'].dt.dayofyear]).quantile(.50)['flow']
df_quant['75'] = df.groupby([df['datetime'].dt.dayofyear]).quantile(.75)['flow']
df_quant['90'] = df.groupby([df['datetime'].dt.dayofyear]).quantile(.90)['flow']

JBR_365
#assign day of year based on date
for i in JBR_365.index:
    JBR_365.loc[i, 'dayofyear'] = JBR_365.loc[i, 'datetime'].dayofyear
    #df_wt['dayofyear'][i] = df_wt['datetime'][i].dayofyear
#initialize quantile columns
JBR_365['min'] = ''
JBR_365['max'] = ''
JBR_365['10']= ''
JBR_365['25']= ''
JBR_365['50']= ''
JBR_365['75']= ''
JBR_365['90']= ''

i = 1
for i in JBR_365.dayofyear:     #assign quantile values to day of year by site
    JBR_365.loc[JBR_365.dayofyear == i, 'min'] = df_quant['min'][i]
    JBR_365.loc[JBR_365.dayofyear == i, 'max'] = df_quant['max'][i]
    JBR_365.loc[JBR_365.dayofyear == i, '10'] = df_quant['10'][i]
    JBR_365.loc[JBR_365.dayofyear == i, '25'] = df_quant['25'][i]
    JBR_365.loc[JBR_365.dayofyear == i, '50'] = df_quant['50'][i]
    JBR_365.loc[JBR_365.dayofyear == i, '75'] = df_quant['75'][i]
    JBR_365.loc[JBR_365.dayofyear == i, '90'] = df_quant['90'][i]

#build figure
fig = go.Figure()
fig.update_layout(
    title_text = 'Streamflow at Jones Bar and seasonal historic flow range', title_x=0.5,
    yaxis_title = 'Flow (cfs)',
    xaxis_title = 'Date',
    legend=dict(
                yanchor="top",
                y=1,
                xanchor="left",
                x=1.065
                )
    )
fig.add_trace(go.Scatter(
    x=JBR_365['datetime'], 
    y= signal.savgol_filter(JBR_365['min'], # smoothes data because day of year repeated over multiple times a day
                            53, # window size used for filtering
                            3), # order of fitted polynomial ,
    hoverinfo='skip',
    mode='lines',
    showlegend = False,
    line=dict(width=0, color='rgb(131, 90, 241)'),
    fill = None # define stack group
))
fig.add_trace(go.Scatter(
    x=JBR_365['datetime'], y= signal.savgol_filter(JBR_365['10'],
                           53, # window size used for filtering
                           3), # order of fitted polynomial ,
    hoverinfo='skip',
    mode='lines',
    name = 'min-10th percentile',
    line=dict(width=0, color='indianred'),
    fill = 'tonexty'
))
fig.add_trace(go.Scatter(
    x=JBR_365['datetime'], y= signal.savgol_filter(JBR_365['25'],
                           53, # window size used for filtering
                           3), # order of fitted polynomial ,
    name = '10-25th percentile',
    mode='lines',
    hoverinfo = 'skip',
    opacity = .1, 
    line=dict(width=0, color='darksalmon'),
    fill = 'tonexty'
))

fig.add_trace(go.Scatter(
    x=JBR_365['datetime'], y= signal.savgol_filter(JBR_365['75'],
                           53, # window size used for filtering
                           3), # order of fitted polynomial ,
    name = '25-75th percentile',
    mode='lines',
    hoverinfo = 'skip',
    line=dict(width=0, color='darkseagreen'),
    fill = 'tonexty'
))
fig.add_trace(go.Scatter(
    x=JBR_365['datetime'], y= signal.savgol_filter(JBR_365['90'],
                           53, # window size used for filtering
                           3), # order of fitted polynomial ,
    name = '75-90th percentile',
    mode='lines',
    hoverinfo = 'skip',
    line=dict(width=0, color='cornflowerblue'),
    fill = 'tonexty'
))

fig.add_trace(go.Scatter(
    x=JBR_365['datetime'], y= signal.savgol_filter(JBR_365['max'],
                            53, # window size used for filtering
                            3), # order of fitted polynomial ,
    name = '90th percentile-max',
    visible = 'legendonly',
    hoverinfo = 'skip',
    mode='lines',
    line=dict(width=0, color='darkblue'),
    fill = 'tonexty'
))

#median line
fig.add_trace(go.Scatter(
    x=JBR_365['datetime'], y= signal.savgol_filter(JBR_365['50'],
                           53, # window size used for filtering
                           4), # order of fitted polynomial ,
    name = 'median',
    mode='lines',
    line=dict(width=2, dash = 'dot', color='dimgrey'),
))

#wtelev line
fig.add_trace(go.Scatter(
    x=JBR_365['datetime'], y= JBR_365['flow'],
    name = 'flow',
    mode='lines',
    line=dict(width=2, color='black'),
))
    
#fig.write_html('C:/Users/'+ user + '/Box/External MEF-WORKSPACE/Realtime_sensor_figures/water_table_elev_S6_historic.html')
print('updated water table context figure')
plot(fig)


#Snow pillow
# ____________________________________________________________
# ________________________________________________________________________________________________________________________
# ____________________________________________________________________________________________________________________________________________________________________________________


https://cdec.water.ca.gov/dynamicapp/req/CSVDataServlet?Stations=CSL&SensorNums=3&dur_code=D&Start=1908-10-15&End=2023-11-15


infile1 = 'https://cdec.water.ca.gov/dynamicapp/req/CSVDataServlet?Stations=CSL&SensorNums=3&dur_code=D&Start=1908-10-15&End=2023-11-15'
dt1 =pd.read_csv(infile1,
                 parse_dates = ['DATE TIME'],
                 na_values={
                       'VALUE':[
                               'NA']}
                 )
cols = list(dt1.columns)
cols = ['STATION_ID','DATE TIME', 'VALUE']
df = dt1[cols]
df.columns = ['site', 'datetime', 'swe']
df['swe'] = pd.to_numeric(df['swe'], errors='coerce')

JBR_365 = df[df.datetime > datetime.now() - pd.to_timedelta("365day")]     

#stats shading

df_quant = pd.DataFrame(columns = ['site','min', '10' , '25', '50', '75', '90', 'max'])
df_quant['min'] = df.groupby([df['datetime'].dt.dayofyear]).min()['swe']
df_quant['max'] = df.groupby([df['datetime'].dt.dayofyear]).max()['swe']
df_quant['10'] = df.groupby([df['datetime'].dt.dayofyear]).quantile(.1)['swe']
df_quant['25'] = df.groupby([df['datetime'].dt.dayofyear]).quantile(.25)['swe']
df_quant['50']= df.groupby([df['datetime'].dt.dayofyear]).quantile(.50)['swe']
df_quant['75'] = df.groupby([df['datetime'].dt.dayofyear]).quantile(.75)['swe']
df_quant['90'] = df.groupby([df['datetime'].dt.dayofyear]).quantile(.90)['swe']

# JBR_365
#assign day of year based on date
for i in JBR_365.index:
    JBR_365.loc[i, 'dayofyear'] = JBR_365.loc[i, 'datetime'].dayofyear
    #df_wt['dayofyear'][i] = df_wt['datetime'][i].dayofyear
#initialize quantile columns
JBR_365['min'] = ''
JBR_365['max'] = ''
JBR_365['10']= ''
JBR_365['25']= ''
JBR_365['50']= ''
JBR_365['75']= ''
JBR_365['90']= ''

i = 1
for i in JBR_365.dayofyear:     #assign quantile values to day of year by site
    JBR_365.loc[JBR_365.dayofyear == i, 'min'] = df_quant['min'][i]
    JBR_365.loc[JBR_365.dayofyear == i, 'max'] = df_quant['max'][i]
    JBR_365.loc[JBR_365.dayofyear == i, '10'] = df_quant['10'][i]
    JBR_365.loc[JBR_365.dayofyear == i, '25'] = df_quant['25'][i]
    JBR_365.loc[JBR_365.dayofyear == i, '50'] = df_quant['50'][i]
    JBR_365.loc[JBR_365.dayofyear == i, '75'] = df_quant['75'][i]
    JBR_365.loc[JBR_365.dayofyear == i, '90'] = df_quant['90'][i]

#build figure
fig = go.Figure()
fig.update_layout(
    title_text = 'SWE at CSSL', title_x=0.5,
    yaxis_title = 'swe (cfs)',
    xaxis_title = 'Date',
    legend=dict(
                yanchor="top",
                y=1,
                xanchor="left",
                x=1.065
                )
    )
fig.add_trace(go.Scatter(
    x=JBR_365['datetime'], 
    y= signal.savgol_filter(JBR_365['min'], # smoothes data because day of year repeated over multiple times a day
                            53, # window size used for filtering
                            3), # order of fitted polynomial ,
    hoverinfo='skip',
    mode='lines',
    showlegend = False,
    line=dict(width=0, color='rgb(131, 90, 241)'),
    fill = None # define stack group
))
fig.add_trace(go.Scatter(
    x=JBR_365['datetime'], y= signal.savgol_filter(JBR_365['10'],
                           53, # window size used for filtering
                           3), # order of fitted polynomial ,
    hoverinfo='skip',
    mode='lines',
    name = 'min-10th percentile',
    line=dict(width=0, color='indianred'),
    fill = 'tonexty'
))
fig.add_trace(go.Scatter(
    x=JBR_365['datetime'], y= signal.savgol_filter(JBR_365['25'],
                           53, # window size used for filtering
                           3), # order of fitted polynomial ,
    name = '10-25th percentile',
    mode='lines',
    hoverinfo = 'skip',
    opacity = .1, 
    line=dict(width=0, color='darksalmon'),
    fill = 'tonexty'
))

fig.add_trace(go.Scatter(
    x=JBR_365['datetime'], y= signal.savgol_filter(JBR_365['75'],
                           53, # window size used for filtering
                           3), # order of fitted polynomial ,
    name = '25-75th percentile',
    mode='lines',
    hoverinfo = 'skip',
    line=dict(width=0, color='darkseagreen'),
    fill = 'tonexty'
))
fig.add_trace(go.Scatter(
    x=JBR_365['datetime'], y= signal.savgol_filter(JBR_365['90'],
                           53, # window size used for filtering
                           3), # order of fitted polynomial ,
    name = '75-90th percentile',
    mode='lines',
    hoverinfo = 'skip',
    line=dict(width=0, color='cornflowerblue'),
    fill = 'tonexty'
))

fig.add_trace(go.Scatter(
    x=JBR_365['datetime'], y= signal.savgol_filter(JBR_365['max'],
                            53, # window size used for filtering
                            3), # order of fitted polynomial ,
    name = '90th percentile-max',
    visible = 'legendonly',
    hoverinfo = 'skip',
    mode='lines',
    line=dict(width=0, color='darkblue'),
    fill = 'tonexty'
))

#median line
fig.add_trace(go.Scatter(
    x=JBR_365['datetime'], y= signal.savgol_filter(JBR_365['50'],
                           53, # window size used for filtering
                           4), # order of fitted polynomial ,
    name = 'median',
    mode='lines',
    line=dict(width=2, dash = 'dot', color='dimgrey'),
))

#wtelev line
fig.add_trace(go.Scatter(
    x=JBR_365['datetime'], y= JBR_365['swe'],
    name = 'flow',
    mode='lines',
    line=dict(width=2, color='black'),
))
    
#fig.write_html('C:/Users/'+ user + '/Box/External MEF-WORKSPACE/Realtime_sensor_figures/water_table_elev_S6_historic.html')
print('updated water table context figure')
plot(fig)


#forecast________________________________________________
#__________________________________________________________________________________________________________________________
#__________________________________________________________________________________________________________________________________________________________


# infile1 = 'https://forecast.weather.gov/MapClick.php?lat=39.1134&lon=-120.2417&FcstType=digitalDWML'

# import requests
# import urllib.request, urllib.parse, urllib.errors
# import ssl
# ss = ssl.create_default_context()
# ctx.check_hostname = False

# URL = "http://insert.your/feed/here.xml"

# response = requests.get('https://forecast.weather.gov/MapClick.php?lat=39.1134&lon=-120.2417&FcstType=digitalDWML')
# with open('feed.xml', 'wb') as file: #change name here or below
#     file.write(response.content)


import xml.etree.ElementTree as ET
tree = ET.parse('NWS.xml')
root = tree.getroot()

for child in root[1]:
    row_data = []
    for value in child[0]:
        row_data.append(value.text)
        
for child in root[1]:
    time_data = []
    for value in child.find('time-layout'):
        time_data.append(value.text)
        print(value.text)

start_time = time_data[1]
st_day = start_time.split('T')[0]
st_time = start_time.split('T')[1].split('-')[0]
st_dt = st_day + '_' + st_time

df = pd.DataFrame(columns = ['datetime', 'qpf'])
df['qpf'] = row_data
df.loc[0,'datetime'] = st_dt
df['datetime'] = pd.to_datetime(df['datetime'], format = '%Y-%m-%d_%H:%M:%S')
i=0
for i in df.index:
    df.loc[i+1, 'datetime'] = df.loc[i,'datetime'] + timedelta(hours = 1)
df['qpf'] = pd.to_numeric(df['qpf'], errors='coerce')

hr_12 = df.loc[0,'datetime'] + timedelta(hours = 12)
hr_12_tot = df[(df['datetime']>= df.loc[0,'datetime']) & (df['datetime']<= hr_12)]
hr_12_tot['qpf'] = pd.to_numeric(hr_12_tot['qpf'], errors='coerce')
tot = 0
for i in hr_12_tot.index:
    tot = tot + hr_12_tot.loc[i,'qpf']
totals_df = pd.DataFrame(columns = ['period', 'total_ppt']) 
totals_df = totals_df.append({'period':'12 hours', 'total_ppt': tot}, ignore_index = True)

hr_24 = df.loc[0,'datetime'] + timedelta(hours = 24)
hr_24_tot = df[(df['datetime']>= df.loc[0,'datetime']) & (df['datetime']<= hr_24)]
hr_24_tot['qpf'] = pd.to_numeric(hr_24_tot['qpf'], errors='coerce')
tot = 0
for i in hr_24_tot.index:
    tot = tot + hr_24_tot.loc[i,'qpf']
totals_df = totals_df.append({'period':'24 hours', 'total_ppt': tot}, ignore_index = True)

hr_48 = df.loc[0,'datetime'] + timedelta(hours =48)
hr_48_tot = df[(df['datetime']>= df.loc[0,'datetime']) & (df['datetime']<= hr_48)]
hr_48_tot['qpf'] = pd.to_numeric(hr_48_tot['qpf'], errors='coerce')
tot = 0
for i in hr_48_tot.index:
    tot = tot + hr_48_tot.loc[i,'qpf']
totals_df = totals_df.append({'period':'48 hours', 'total_ppt': tot}, ignore_index = True)

hr_72 = df.loc[0,'datetime'] + timedelta(hours = 72)
hr_72_tot = df[(df['datetime']>= df.loc[0,'datetime']) & (df['datetime']<= hr_72)]
hr_72_tot['qpf'] = pd.to_numeric(hr_72_tot['qpf'], errors='coerce')
tot = 0
for i in hr_72_tot.index:
    tot = tot + hr_72_tot.loc[i,'qpf']
totals_df =totals_df.append({'period':'72 hours', 'total_ppt': tot}, ignore_index = True)


fig = px.bar(totals_df, x = 'period', y = 'total_ppt', color = 'period')
plot(fig)

