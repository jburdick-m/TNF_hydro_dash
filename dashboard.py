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
import math


# JBR_365 = pd.read_csv('C:\\Users\\jburdick\\Box\\01. jacob.burdick Workspace\\Documents\\TNF dashboard\\JBR_365.csv')
JBR_365 = pd.read_csv('JBR_365.csv')
#build figure
fig = go.Figure()
fig.update_layout(
    title_text = 'Streamflow at Jones Bar', title_x=0.5,
    yaxis_title = 'Flow (cfs)',
    xaxis_title = '',
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
    line=dict(width=2, color='rgba(0, 255, 252, 0.8)'),
))

fig.update_layout(
    paper_bgcolor= 'rgba(0, 0, 0, 0)',
    plot_bgcolor='rgba(0, 0, 0, 0)',
)
fig.update_layout(font = dict(color = 'white'))
config = {'displayModeBar': False}

#fig.write_html('C:/Users/'+ user + '/Box/External MEF-WORKSPACE/Realtime_sensor_figures/water_table_elev_S6_historic.html')
print('updated streamflow1')
#plot(fig)
Fig1a = fig

################# SF2
# JBR_365 = pd.read_csv('C:\\Users\\jburdick\\Box\\01. jacob.burdick Workspace\\Documents\\TNF dashboard\\GBR.csv')
JBR_365 = pd.read_csv('GBR.csv')
#build figure
fig = go.Figure()
fig.update_layout(
    title_text = 'Streamflow at Goodyears Bar', title_x=0.5,
    yaxis_title = 'Flow (cfs)',
    xaxis_title = '',
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
    line=dict(width=2, color='rgba(0, 255, 252, 0.8)'),
))

fig.update_layout(
    paper_bgcolor='rgba(0,0,0,0)',
    plot_bgcolor='rgba(0,0,0,0)',
)

fig.update_layout(font = dict(color = 'white'))
config = {'displayModeBar': False}
#fig.write_html('C:/Users/'+ user + '/Box/External MEF-WORKSPACE/Realtime_sensor_figures/water_table_elev_S6_historic.html')
#plot(fig)
Fig1b = fig
print('updated streamflow2')
#Snow pillow
# ____________________________________________________________
# ________________________________________________________________________________________________________________________
# ____________________________________________________________________________________________________________________________________________________________________________________


# JBR_365 = pd.read_csv('C:\\Users\\jburdick\\Box\\01. jacob.burdick Workspace\\Documents\\TNF dashboard\\CSS.csv')
JBR_365 = pd.read_csv('CSS.csv')
#build figure
fig = go.Figure()
fig.update_layout(
    title_text = 'Snow water content at CSSL', title_x=0.5,
    yaxis_title = 'SWE (in)',
    xaxis_title = '',
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
    line=dict(width=2, color='rgba(0, 255, 252, 0.8)'),
))

y_min = -1
y_max = JBR_365['swe'].max() + 2
fig.update_yaxes(range = [y_min, y_max])
fig.update_layout(
    paper_bgcolor='rgba(0,0,0,0)',
    plot_bgcolor='rgba(0,0,0,0)',
)
fig.update_layout(font = dict(color = 'white'))
config = {'displayModeBar': False}
#fig.write_html('C:/Users/'+ user + '/Box/External MEF-WORKSPACE/Realtime_sensor_figures/water_table_elev_S6_historic.html')
print('updated SWE')
#plot(fig)
Fig2=fig

#forecast________________________________________________
#__________________________________________________________________________________________________________________________

# totals_df = pd.read_csv('C:\\Users\\jburdick\\Box\\01. jacob.burdick Workspace\\Documents\\TNF dashboard\\forecast.csv')
totals_df = pd.read_csv('forecast.csv')
fig = px.bar(totals_df, x = 'period', y = 'total_ppt', color = 'period')
y_min = -0.005
y_max = totals_df['total_ppt'].max() + .01
fig.update_yaxes(range = [y_min, y_max])
fig.update_layout(
    title_text ='Forecasted precip at Round Mountain, Nevada City CA', title_x=0.5,
    yaxis_title = 'PPT (in)',
    xaxis_title = '',
    paper_bgcolor='rgba(0,0,0,0)',
    plot_bgcolor='rgba(0,0,0,0)',
)
fig.update_layout(font = dict(color = 'white'))
config = {'displayModeBar': False}
#plot(fig)
Fig3 = fig
#Build dash app.
print('updated forecast')

print('building map')
# Sample coordinates for clickable points (you can replace these with your actual data)
map_data = {
    'points': ['North Yuba at Goodyears Bar', 'South Yuba at Jones Bar'],
    'lat': [39.52489, 39.29200],
    'lon': [-120.93800, -121.10400]
#     'lon': [-122.4194, -74.0060]
# }
}
# Create a map figure using Plotly Express
map_fig = px.scatter_mapbox(
    map_data, lat='lat', lon='lon', hover_name='points', zoom=9
)
map_fig.update_layout(
    mapbox_style="carto-darkmatter",
    mapbox_layers=[
        {
            "below": 'traces',
            "sourcetype": "raster",
            "sourceattribution": "United States Geological Survey",
            "source": [
                "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}"
            ]
        }
      ])
map_fig.update_layout(
    paper_bgcolor='rgba(0,0,0,0)',
    plot_bgcolor='rgba(0,0,0,0)',
    title_text ='\n \n \n \n \n \n Select streamflow gage from map', title_x=0.5,
    font = dict(color = 'white')
)
map_fig.update_traces(marker={'size': 15})


print('processing header')
import requests
from bs4 import BeautifulSoup as bs
from PIL import Image
from io import BytesIO
import base64

# Attempt to fetch webcam image; fallback to placeholder if offline/unavailable
encoded_image_src = ''
try:
    #parse webpage for webcam image url
    def get_image_url(page_url):
        response = requests.get(page_url)
        if response.status_code == 200:
            soup = bs(response.text,'html.parser')
            images = soup.find_all('img')
            image_url = [img['src'] for img in images if 'src' in img.attrs]
            return image_url
        else:
            return "Failed to retrieve webpage"

    image_urls = get_image_url('https://www.sugarbowl.com/webcams#lightbox_webcams-5')

    # If get_image_url fails, it returns a string, so check type
    if isinstance(image_urls, list):
        nobhill = [match for match in image_urls if "https://sugar3.sugarbowl.com/graphics/webcams/nobhill/XMasTreeTop" in match]

        if nobhill:
            nobhill = nobhill[0]
            nobhill = nobhill.split(' ')[0]

            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'}

            def open_image_from_url(url):
                response = requests.get(url, headers=headers)
                if response.status_code == 200:
                    image = Image.open(BytesIO(response.content))
                    return image
                else:
                    raise Exception(f"Failed to retrieve the image, status code: {response.status_code}")

            image = open_image_from_url(nobhill)

            angle = 3 # degrees
            rotated = image.rotate(angle, resample=Image.BICUBIC, expand = True)

            w, h = image.size
            angleR = math.radians(angle)

            # Dimensions of the rotated image
            rotated_width, rotated_height = rotated.size

            def rotatedRectWithMaxArea(w, h, angleR):
              """
              Given a rectangle of size wxh that has been rotated by 'angle' (in
              radians), computes the width and height of the largest possible
              axis-aligned rectangle (maximal area) within the rotated rectangle.
              """
              if w <= 0 or h <= 0:
                return 0,0

              width_is_longer = w >= h
              side_long, side_short = (w,h) if width_is_longer else (h,w)

              # since the solutions for angle, -angle and 180-angle are all the same,
              # if suffices to look at the first quadrant and the absolute values of sin,cos:
              sin_a, cos_a = abs(math.sin(angleR)), abs(math.cos(angleR))
              if side_short <= 2.*sin_a*cos_a*side_long or abs(sin_a-cos_a) < 1e-10:
                # half constrained case: two crop corners touch the longer side,
                #   the other two corners are on the mid-line parallel to the longer line
                x = 0.5*side_short
                wr,hr = (x/sin_a,x/cos_a) if width_is_longer else (x/cos_a,x/sin_a)
              else:
                # fully constrained case: crop touches all 4 sides
                cos_2a = cos_a*cos_a - sin_a*sin_a
                wr,hr = (w*cos_a - h*sin_a)/cos_2a, (h*cos_a - w*sin_a)/cos_2a

              return wr,hr

            dims = rotatedRectWithMaxArea(w,h,angleR)
            w,h = rotated.size
            L = (w - dims[0])/2
            T = h - (h - dims[1])/2
            R = w - (w - dims[0])/2
            B = (h - dims[1])/2

            cropped = rotated.crop((L,B,R,T))

            buffer = BytesIO()
            cropped.save(buffer, format = 'JPEG')
            encoded_image = base64.b64encode(buffer.getvalue()).decode()
            encoded_image_src = 'data:image/jpeg;base64,' + encoded_image
        else:
             print("Webcam image URL not found in page content.")
    else:
        print("Failed to retrieve webcam page.")

except Exception as e:
    print(f"Error fetching webcam image: {e}. Using default/empty banner.")

print('building dashboard')
# Create the Dash app
app = dash.Dash(__name__)

# Define the layout
app.layout = html.Div(style={'backgroundColor': '#111111'}, children=[

    # Banner container
    html.Div(
        style={
            'height': '320px', # Set the height of the banner
            'width': '100%', # Full width
            'overflow': 'hidden' # Hide overflow caused by rotation
        },
        children=[
            # Rotated image inside the banner
            html.Div(
                style={
                    'background-image': f'url("{encoded_image_src}")',  #f'url("{encoded_image_src}")'
                    'height': '320px',
                    'width': '100%',
                    'background-position': '0% 50%',
                    'background-size': 'cover',
                    'background-repeat': 'no-repeat',
                    'position': 'relative'
                }
            )
        ]
    ),
    html.H1('Tahoe National Forest Hydro Dashboard', style={
           'fontSize': '32px', # Adjust the size as needed
           'color': 'white', # Sets the text color to white
           'fontFamily': 'Verdana', # Sets the font to Verdana
           'textAlign': 'center'
       }),
    html.Div([
        dcc.Graph(figure=map_fig,
                  id='map-panel',
                  config={'displayModeBar': False}
                  ),
        dcc.Graph(id='graph-panel', config={'displayModeBar': False}),
    ], style={'columnCount':2}),
    html.Div([
        dcc.Graph(
            id='graph2',
            figure=Fig2,
            config={'displayModeBar': False}
        ),
        dcc.Graph(
            id='graph3',
            figure=Fig3,
            config={'displayModeBar': False}
        ),
    ], style={'columnCount': 2})

])

# Callback to update the graph based on map clicks
@app.callback(
    Output('graph-panel', 'figure'),
    [Input('map-panel', 'clickData')]
)
def update_graph(clickData):
    if not clickData:
        return Fig1a  # Default figure
    point_name = clickData['points'][0]['hovertext']
    if point_name == 'North Yuba at Goodyears Bar':
        return Fig1b
    elif point_name == 'South Yuba at Jones Bar':
        return Fig1a

# Run the app
if __name__ == '__main__':
    app.run(debug=True)



    