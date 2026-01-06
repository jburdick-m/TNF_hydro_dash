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
from dash import dcc
from dash import html
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



ssl._create_default_https_context = ssl._create_unverified_context

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
print('updated streamflow1    \n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n updated streamflow1 \n updated streamflow 1 \n updated streamflow1')
#plot(fig)
Fig1a = fig





infile1 = 'https://cdec.water.ca.gov/dynamicapp/req/CSVDataServlet?Stations=GYB&SensorNums=20&dur_code=E&Start=2008-08-01T00%3A00&End='
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
#plot(fig)
Fig1b = fig
print('updated streamflow1    \n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n updated streamflow2')
#Snow pillow
# ____________________________________________________________
# ________________________________________________________________________________________________________________________
# ____________________________________________________________________________________________________________________________________________________________________________________


#https://cdec.water.ca.gov/dynamicapp/req/CSVDataServlet?Stations=CSL&SensorNums=3&dur_code=D&Start=1908-10-15&End=2023-11-15


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
   
y_min = -1
y_max = JBR_365['swe'].max() + 2
fig.update_yaxes(range = [y_min, y_max])
 
#fig.write_html('C:/Users/'+ user + '/Box/External MEF-WORKSPACE/Realtime_sensor_figures/water_table_elev_S6_historic.html')
print('updated SWe    \n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n updated SWEEEEEEEEEE')
#plot(fig)
Fig2=fig

#forecast________________________________________________
#__________________________________________________________________________________________________________________________
#__________________________________________________________________________________________________________________________________________________________

# info https://digital.mdl.nws.noaa.gov/xml/rest.php#use_it
# infile1 = 'https://forecast.weather.gov/MapClick.php?lat=39.1134&lon=-120.2417&FcstType=digitalDWML'

import requests
from bs4 import BeautifulSoup as bs
os.chdir('C:\\Users\\jburdick\\Box\\01. jacob.burdick Workspace\\Documents\\TNF dashboard')


file = requests.get('https://forecast.weather.gov/MapClick.php?lat=39.1134&lon=-120.2417&FcstType=digitalDWML')
soup= bs(file.content,"lxml-xml")
# print (soup.find("data"))

with open("file_nws.xml", "w", encoding='utf-8') as file:
    file.write(str(soup.prettify()))

import xml.etree.ElementTree as ET
tree = ET.parse('file_NWS.xml')
root = tree.getroot()

row_data = []
for value in root[1].find('parameters').find('hourly-qpf'):
   # print(value.text)    
    if value.text: row_data.append(value.text.splitlines()[1].split('     ')[1])

time_data = []
for value in root[1].find('time-layout'):
    time_data.append(value.text)


start_time = time_data[1]
st_day = start_time.split('T')[0]
st_day = st_day.split('    ')[1]
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

hr_7d = df.loc[0,'datetime'] + timedelta(hours = 166)
hr_7d_tot = df[(df['datetime']>= df.loc[0,'datetime']) & (df['datetime']<= hr_7d)]
hr_7d_tot['qpf'] = pd.to_numeric(hr_7d_tot['qpf'], errors='coerce')
tot = 0
for i in hr_7d_tot.index:
    tot = tot + hr_7d_tot.loc[i,'qpf']
totals_df =totals_df.append({'period':'7 days', 'total_ppt': tot}, ignore_index = True)



fig = px.bar(totals_df, x = 'period', y = 'total_ppt', color = 'period')
y_min = -0.005
y_max = totals_df['total_ppt'].max() + .01
fig.update_yaxes(range = [y_min, y_max])
#plot(fig)
Fig3 = fig
#Build dash app.
print("building dashboard      \n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n 'building dashboard")
import dash
from dash import dcc, html, Input, Output
import plotly.express as px

# Assuming Fig1a, Fig1b, Fig1c are pre-generated Plotly figures
# from somewhere import Fig1a, Fig1b, Fig1c

# Sample coordinates for clickable points (you can replace these with your actual data)
map_data = {
    'points': ['North Yuba at Goodeyars Bar', 'South Yuba at Jones Bar'],
    'lat': [39.52489, 39.29200],
    'lon': [-120.93800, -121.10400]
}

# Create a map figure using Plotly Express
map_fig = px.scatter_mapbox(
    map_data, lat='lat', lon='lon', hover_name='points',
    zoom=3, height=300
)
map_fig.update_layout(mapbox_style="stamen-terrain")

# Create the Dash app
app = dash.Dash(__name__)

# Define the layout
app.layout = html.Div(style={'backgroundColor': '#111111'}, children=[
    html.H1(
        children='Tahoe National Forest Hydro Dashboard with map',
        style={'textAlign': 'center', 'color': '#7FDBFF'}
    ),
    html.Div([
        dcc.Graph(
            id='graph1',
            figure=Fig1a
        ),
        dcc.Graph(figure=map_fig, id='map-panel'),
        dcc.Graph(
            id='graph2',
            figure=Fig2
        ),
        dcc.Graph(
            id='graph3',
            figure=Fig3
        ),
    ], style={'columnCount': 2})
])

@app.callback(
    Output('graph1', 'figure'),
    [Input('map-panel', 'clickData')]
)
def update_graph(clickData):
    if not clickData:
        return Fig1a  # Default figure
    point_name = clickData['points'][0]['hovertext']
    if point_name == 'North Yuba at Goodeyars Bar':
        return Fig1a
    elif point_name == 'South Yuba at Jones Bar':
        return Fig1b

# Run the app
if __name__ == '__main__':
    app.run_server(debug=True)
    
    
    
    
    