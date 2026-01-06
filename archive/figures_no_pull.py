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

  
JBR_365 = pd.read_csv('C:\\Users\\jburdick\\Box\\01. jacob.burdick Workspace\\Documents\\TNF dashboard\\JBR_365.csv')
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

################# SF2
JBR_365 = pd.read_csv('C:\\Users\\jburdick\\Box\\01. jacob.burdick Workspace\\Documents\\TNF dashboard\\GBR.csv')
#build figure
fig = go.Figure()
fig.update_layout(
    title_text = 'Streamflow at Goodyears Bar and seasonal historic flow range', title_x=0.5,
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
#plot(fig)
Fig1b = fig
print('updated streamflow1    \n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n updated streamflow2')
#Snow pillow
# ____________________________________________________________
# ________________________________________________________________________________________________________________________
# ____________________________________________________________________________________________________________________________________________________________________________________


JBR_365 = pd.read_csv('C:\\Users\\jburdick\\Box\\01. jacob.burdick Workspace\\Documents\\TNF dashboard\\CSS.csv')
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

totals_df = pd.read_csv('C:\\Users\\jburdick\\Box\\01. jacob.burdick Workspace\\Documents\\TNF dashboard\\forecast.csv')
fig = px.bar(totals_df, x = 'period', y = 'total_ppt', color = 'period')
y_min = -0.005
y_max = totals_df['total_ppt'].max() + .01
fig.update_yaxes(range = [y_min, y_max])
#plot(fig)
Fig3 = fig
#Build dash app.
print("building dashboard      \n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n 'building dashboard")
# import dash
# from dash import dcc, html, Input, Output
# import plotly.express as px

# # Assuming Fig1a, Fig1b, Fig1c are pre-generated Plotly figures
# # from somewhere import Fig1a, Fig1b, Fig1c

# # Sample coordinates for clickable points (you can replace these with your actual data)
# map_data = {
#     'points': ['North Yuba at Goodeyars Bar', 'South Yuba at Jones Bar'],
#     'lat': [39.52489, 39.29200],
#     'lon': [-120.93800, -121.10400]
# }

# # Create a map figure using Plotly Express
# map_fig = px.scatter_mapbox(
#     map_data, lat='lat', lon='lon', hover_name='points',
#     zoom=3, height=300
# )
# map_fig.update_layout(mapbox_style="open-street-map")

# # Create the Dash app
# app = dash.Dash(__name__)

# # Define the layout
# app.layout = html.Div(style={'backgroundColor': '#111111'}, children=[
#     html.H1(
#         children='Tahoe National Forest Hydro Dashboard with map',
#         style={'textAlign': 'center', 'color': '#7FDBFF'}
#     ),
#     html.Div([
#         dcc.Graph(
#             id='graph1',
#             figure=Fig1a
#         ),
#         dcc.Graph(figure=map_fig, id='map-panel'
#         ),
#         dcc.Graph(
#             id='graph2',
#             figure=Fig2
#         ),
#         dcc.Graph(
#             id='graph3',
#             figure=Fig3
#         ),
#     ], style={'columnCount': 2})
# ])

# @app.callback(
#     Output('graph1', 'figure'),
#     [Input('map-panel', 'clickData')]
# )
# def update_graph(clickData):
#     if not clickData:
#         return Fig1a  # Default figure
#     point_name = clickData['points'][0]['hovertext']
#     if point_name == 'North Yuba at Goodeyars Bar':
#         return Fig1a
#     elif point_name == 'South Yuba at Jones Bar':
#         return Fig1b

# # Run the app
# if __name__ == '__main__':
#     app.run_server(debug=True)



import dash
from dash import dcc, html, Input, Output
import plotly.express as px

# Assuming Fig1a, Fig1b, Fig1c are pre-generated Plotly figures
# from somewhere import Fig1a, Fig1b, Fig1c

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
    map_data, lat='lat', lon='lon', hover_name='points',
    zoom=9, height=600
)
map_fig.update_layout(mapbox_style="open-street-map")

# Create the Dash app
app = dash.Dash(__name__)

# Define the layout
app.layout = html.Div([
    html.Div([
        dcc.Graph(figure=map_fig, id='map-panel')
    ], style={'width': '48%', 'display': 'inline-block'}),
   
    html.Div([
        dcc.Graph(id='graph-panel')
    ], style={'width': '48%', 'float': 'right', 'display': 'inline-block'})
])

# Callback to update the graph based on map clicks
@app.callback(
    Output('graph-panel', 'figure'),
    [Input('map-panel', 'clickData')]
)
def update_graph(clickData):
    if not clickData:
        return Fig1b  # Default figure
    point_name = clickData['points'][0]['hovertext']
    if point_name == 'North Yuba at Goodyears Bar':
        return Fig1b
    elif point_name == 'South Yuba at Jones Bar':
        return Fig1a

# Run the app
if __name__ == '__main__':
    app.run_server(debug=True)
    
    
    
    