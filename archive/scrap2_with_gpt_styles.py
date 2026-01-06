# -*- coding: utf-8 -*-
"""
Created on Mon Nov 27 12:26:06 2023

@author: jburdick
"""

    
    
#         dcc.Graph(figure=map_fig, id='map-panel')
#     ], style={'width': '48%', 'display': 'inline-block'}),
   
#     html.Div([
#         dcc.Graph(id='graph-panel')
#     ], style={'width': '48%', 'float': 'right', 'display': 'inline-block'})
# ])

# # Callback to update the graph based on map clicks
# @app.callback(
#     Output('graph-panel', 'figure'),
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
#     elif point_name == 'Point C':
#         return Fig1c

# # Run the app
# if __name__ == '__main__':
#     app.run_server(debug=True)











# import dash


# # Assuming fig1, fig2, fig3, and fig4 are your pre-generated Plotly figures
# # Import them here or define them above this code
# # from somewhere import fig1, fig2, fig3, fig4

# # Create a Dash app
# app = dash.Dash(__name__)

# # Define the app layout
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

# # Run the app
# if __name__ == '__main__':
#     app.run_server(host = '127.0.0.1', port = 8050)






























# app = dash.Dash(__name__, external_stylesheets=external_stylesheets)
# site_list = ['Bog Lake', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6']
# server = app.server
# tabs_styles = {
#     'height': '24px'
# }


# app.layout = html.Div([
#     html.H2(html.A([html.Img(
#             style={
#             'background-image': 'url("https://phenocam.sr.unh.edu/data/latest/boglakepeatland.jpg")',            
#             'height' : 250,
#             'width' : 1296,
#             'background-position': '0% 23%',
#             'background-size':'cover',
#             'float' : 'none',
#             'position' : 'relative',
#             'padding-top' : 0,
#             'padding-right' : 0
#                 },   
#         ),
#         dcc.Interval(
#             id='interval-component',
#             interval=1*1000, # in milliseconds
#             n_intervals=0
#         )
#         ], href = 'https://phenocam.sr.unh.edu/webcam/sites/boglakepeatland/', target="_blank"),
#         ),
#     html.H2('Marcell Experimental Forest dashboard'),        
#     dcc.Tabs([
#         dcc.Tab(label = 'Peatland Water Table Elevation', children =[
#             dcc.Graph(id='graph-output', figure={}, style={"height": 450}),
#             dcc.RadioItems(id = 'my-radioitem', 
#                            value = 'Bog Lake',
#                            options = [{'label':s, 'value':s} for s in site_list], 
#                            labelStyle={'display': 'inline-block'}),
#             dcc.Graph(figure = fig_2, style={"height": 450})
#             ]),
#         dcc.Tab(label = 'Streamflow', children = [
#             dcc.Graph(figure = fig_3, style={"height": 500})]),
#         dcc.Tab(label = 'Precipitation', children = [
#             dcc.Graph(figure = fig_4, style={"height": 900})]),
#         dcc.Tab(label = 'Runoff', children = [
#             dcc.Graph(figure = RO_fig, style={"height": 500})]), 
#         dcc.Tab(label = 'Meteorology', children = [
#             dcc.Graph(figure = fig_5, style={"height": 900})]),
#         dcc.Tab(label = 'Soil Temperature', children = [
#             dcc.Graph(figure = soil_fig, style={"height": 900})]),
#         dcc.Tab(label = 'Battery Voltage', children = [
#             dcc.Graph(figure = batt_fig, style={"height": 700})])
        
#         ])
#     ])

# @app.callback(
#     Output(component_id='graph-output', component_property='figure'),
#     [Input(component_id='my-radioitem', component_property='value')],
#     # [Input(component_id='my-button', component_property='n_clicks')],
#     # [State(component_id='my-dropdown', component_property='value')],
#     prevent_initial_call=False
# )
# #val_chosen = 'S2'

# #undefined variables are set above at the end of wt context plot "locals()[val_chosen + '_fig'] = fig"
# #should update to remove dependancy to setting local variables in naming plot
# def update_my_graph(value):
#     if value == 'Bog Lake':
#         return BOGLK_fig
#     elif value == 'S1':
#         return S1_fig
#     elif value == 'S2':
#         return S2_fig
#     elif value == 'S3':
#         return S3_fig
#     elif value == 'S4':
#         return S4_fig
#     elif value == 'S5':
#         return S5_fig
#     elif value == 'S6':
#         return S6_fig

# if __name__ == '__main__':
#     app.run_server(debug=False)





































# # import xml.etree.ElementTree as ET
# # tree = ET.parse('file_NWS.xml')
# # root = tree.getroot()

# # for child in root[1]:
# #     row_data = []
# #     for value in child[0]:
# #         row_data.append(value.text)
        
# # for child in root[1]:
# #     time_data = []
# #     for value in child.find('time-layout'):
# #         time_data.append(value.text)
# #         print(value.text)

# # start_time = time_data[1]
# # st_day = start_time.split('T')[0]
# # st_time = start_time.split('T')[1].split('-')[0]
# # st_dt = st_day + '_' + st_time

# # df = pd.DataFrame(columns = ['datetime', 'qpf'])
# # df['qpf'] = row_data
# # df.loc[0,'datetime'] = st_dt
# # df['datetime'] = pd.to_datetime(df['datetime'], format = '%Y-%m-%d_%H:%M:%S')
# # i=0
# # for i in df.index:
# #     df.loc[i+1, 'datetime'] = df.loc[i,'datetime'] + timedelta(hours = 1)
# # df['qpf'] = pd.to_numeric(df['qpf'], errors='coerce')

# # hr_12 = df.loc[0,'datetime'] + timedelta(hours = 12)
# # hr_12_tot = df[(df['datetime']>= df.loc[0,'datetime']) & (df['datetime']<= hr_12)]
# # hr_12_tot['qpf'] = pd.to_numeric(hr_12_tot['qpf'], errors='coerce')
# # tot = 0
# # for i in hr_12_tot.index:
# #     tot = tot + hr_12_tot.loc[i,'qpf']
# # totals_df = pd.DataFrame(columns = ['period', 'total_ppt']) 
# # totals_df = totals_df.append({'period':'12 hours', 'total_ppt': tot}, ignore_index = True)

# # hr_24 = df.loc[0,'datetime'] + timedelta(hours = 24)
# # hr_24_tot = df[(df['datetime']>= df.loc[0,'datetime']) & (df['datetime']<= hr_24)]
# # hr_24_tot['qpf'] = pd.to_numeric(hr_24_tot['qpf'], errors='coerce')
# # tot = 0
# # for i in hr_24_tot.index:
# #     tot = tot + hr_24_tot.loc[i,'qpf']
# # totals_df = totals_df.append({'period':'24 hours', 'total_ppt': tot}, ignore_index = True)

# # hr_48 = df.loc[0,'datetime'] + timedelta(hours =48)
# # hr_48_tot = df[(df['datetime']>= df.loc[0,'datetime']) & (df['datetime']<= hr_48)]
# # hr_48_tot['qpf'] = pd.to_numeric(hr_48_tot['qpf'], errors='coerce')
# # tot = 0
# # for i in hr_48_tot.index:
# #     tot = tot + hr_48_tot.loc[i,'qpf']
# # totals_df = totals_df.append({'period':'48 hours', 'total_ppt': tot}, ignore_index = True)

# # hr_72 = df.loc[0,'datetime'] + timedelta(hours = 72)
# # hr_72_tot = df[(df['datetime']>= df.loc[0,'datetime']) & (df['datetime']<= hr_72)]
# # hr_72_tot['qpf'] = pd.to_numeric(hr_72_tot['qpf'], errors='coerce')
# # tot = 0
# # for i in hr_72_tot.index:
# #     tot = tot + hr_72_tot.loc[i,'qpf']
# # totals_df =totals_df.append({'period':'72 hours', 'total_ppt': tot}, ignore_index = True)


# os.chdir('C:\\Users\\jburdick\\downloads')
# df = pd.read_csv('palisades tahoe.csv')
# df['date'] = pd.date_range(start = '10/1/2019', end = '9/30/2020')
# df.to_csv('PT.csv')

# import plotly.graph_objects as go
# import pandas as pd

# # Load your data
# data = pd.read_csv('PT.csv') # Replace with your data file

# # Plotting
# fig = go.Figure()
# year_columns = [str(year) for year in range(1981, 2024)] # Adjust years as needed
# for year in year_columns:
#     fig.add_trace(go.Scatter(x=data['date'], y=data[year], mode='lines', name=year))

# # Adding shading for percentiles
# fig.add_trace(go.Scatter(
#     x=data['date'].tolist() + data['date'].tolist()[::-1], # x, then x reversed
#     y=data['90%'].tolist() + data['10%'].tolist()[::-1], # upper, then lower reversed
#     fill='toself',
#     fillcolor='rgba(0,100,80,0.2)',
#     line=dict(color='rgba(255,255,255,0)'),
#     name='10th to 90th percentile',
# ))

# fig.add_trace(go.Scatter(
#     x=data['date'].tolist() + data['date'].tolist()[::-1], # x, then x reversed
#     y=data['70%'].tolist() + data['30%'].tolist()[::-1], # upper, then lower reversed
#     fill='toself',
#     fillcolor='rgba(0,176,246,0.2)',
#     line=dict(color='rgba(255,255,255,0)'),
#     name='30th to 70th percentile',
# ))

# # Updating the layout
# fig.update_layout(
#     title='Snow Water Equivalent (SWE) for Each Year (1981-2023) with Percentile Shading',
#     xaxis_title='Date',
#     yaxis_title='SWE',
#     hovermode="x"
# )

# plot(fig)

# # Load your data
# file_path = 'path_to_your_file.csv' # Replace with your file path
# snow_data = pd.read_csv('Palisades Tahoe.csv')

# # Filtering out non-year columns
# year_columns = [col for col in snow_data.columns if col.isdigit()]

# # Initialize the figure
# fig = go.Figure()

# # Iterate over each year column to add to the plot
# for year in year_columns:
#     year_data = snow_data[['date', year]].copy()
#     # Adjust the year for the dates (e.g., using 2019 for water year 2020)
#     start_year = int(year) - 1
#     year_data['date'] = pd.to_datetime(year_data['date'], format='%m-%d', errors='coerce')
#     year_data['date'] = year_data['date'].apply(lambda d: d.replace(year=start_year if d.month < 10 else start_year + 1))

#     # Check for leap year and adjust
#     if len(year_data) == 366:
#         year_data = year_data.iloc[:-1, :] # Drop Feb 29th for leap years

#     fig.add_trace(go.Scatter(x=year_data['date'], y=year_data[year], mode='lines', name=f'SWE {year}'))

# # Adding percentile shadings (using the last year as a reference for simplicity)
# last_year_percentiles = snow_data[['date', 'Min', '10%', '30%', '70%', '90%', 'Max', 'Median (POR)']].copy()
# last_year_percentiles['date'] = pd.to_datetime(last_year_percentiles['date'], format='%m-%d', errors='coerce')
# last_year_percentiles['date'] = last_year_percentiles['date'].apply(lambda d: d.replace(year=2023)) # Using a common year for plotting

# # Check for leap year and adjust
# if len(last_year_percentiles) == 366:
#     last_year_percentiles = last_year_percentiles.iloc[:-1, :] # Drop Feb 29th for leap years

# # Add percentile shadings
# percentile_cols = ['Min', '10%', '30%', '70%', '90%', 'Max']
# percentile_colors = ['lightgrey', 'blue', 'green', 'blue', 'lightgrey']
# for i in range(len(percentile_cols)-1):
#     fig.add_trace(go.Scatter(x=last_year_percentiles['date'], y=last_year_percentiles[percentile_cols[i]], fill=None, mode='lines', line=dict(color=percentile_colors[i]), showlegend=False))
#     fig.add_trace(go.Scatter(x=last_year_percentiles['date'], y=last_year_percentiles[percentile_cols[i+1]], fill='tonexty', mode='lines', line=dict(color=percentile_colors[i]), showlegend=False))

# # Add median POR line
# fig.add_trace(go.Scatter(x=last_year_percentiles['date'], y=last_year_percentiles['Median (POR)'], mode='lines', line=dict(color='black', dash='dash'), name='Median (POR)'))

# # Update layout - hiding the year in x-axis labels
# fig.update_layout(
#     title='Snow Water Equivalent (SWE) Across Water Years',
#     xaxis_title='Date',
#     yaxis_title='SWE (inches)',
#     xaxis=dict(
#         tickformat='%b %d', # Displaying only month and day
#         tickmode='auto'
#     )
# )
# plot(fig)


# new_snow_data = pd.read_csv('PT.csv')

# # Convert 'date' column to datetime
# new_snow_data['date'] = pd.to_datetime(new_snow_data['date'])

# # Initialize the figure
# fig = go.Figure()

# # Psychedelic color palette for lines
# psychedelic_colors = ['#9400D3', '#4B0082', '#0000FF', '#00FF00', '#FFFF00', '#FF7F00', '#FF0000']

# # Filtering out non-year columns for SWE data
# year_columns = [col for col in new_snow_data.columns if col.isdigit()]

# # Iterate over each year column to add to the plot with dynamic lines
# for index, year in enumerate(year_columns):
#     fig.add_trace(go.Scatter(
#         x=new_snow_data['date'], 
#         y=new_snow_data[year], 
#         mode='lines', 
#         name=f'SWE {year}',
#         line=dict(width=3, color=psychedelic_colors[index % len(psychedelic_colors)], shape='spline')
#     ))

# # Adding percentile shadings

# neon_colors = ['#cb3301', '#ff0066', '#ff6666', '#fe01b1', '#cc00ff', '#ee82ee']

# # Adding neon percentile shadings with bold lines
# percentile_cols = ['Min', '10%', '30%', '70%', '90%', 'Max']
# for i in range(len(percentile_cols)-1):
#     fig.add_trace(go.Scatter(x=new_snow_data['date'], y=new_snow_data[percentile_cols[i]], fill=None, mode='lines', line=dict(color=neon_colors[i], width=4), showlegend=False))
#     fig.add_trace(go.Scatter(x=new_snow_data['date'], y=new_snow_data[percentile_cols[i+1]], fill='tonexty', mode='lines', line=dict(color=neon_colors[i], width=4), showlegend=False))

# # percentile_cols = ['Min', '10%', '30%', '70%', '90%', 'Max']
# # percentile_colors = n_colors('rgba(255, 200, 200, 0.8)', 'rgba(200, 200, 255, 0.8)', len(percentile_cols) - 1, colortype='rgb')

# for i in range(len(percentile_cols)-1):
#     fig.add_trace(go.Scatter(
#         x=new_snow_data['date'], 
#         y=new_snow_data[percentile_cols[i]], 
#         fill=None, 
#         mode='lines',
#         line=dict(color=percentile_colors[i], width=0),
#         showlegend=False
#     ))
#     fig.add_trace(go.Scatter(
#         x=new_snow_data['date'], 
#         y=new_snow_data[percentile_cols[i+1]], 
#         fill='tonexty', 
#         mode='lines',
#         line=dict(color=percentile_colors[i], width=0),
#         showlegend=False
#     ))

# # Add median POR line with a standout color
# fig.add_trace(go.Scatter(
#     x=new_snow_data['date'], 
#     y=new_snow_data['Median (POR)'], 
#     mode='lines', 
#     line=dict(color='white', width=4, dash='dot'),
#     name='Median (POR)'
# ))

# # Psychedelic layout adjustments
# fig.update_layout(
#     title='Snow Water Equivalent (SWE) at Palisades Tahoe',
#     xaxis_title='Date',
#     yaxis_title='SWE (inches)',
#     plot_bgcolor='black', # Deep black background
#     paper_bgcolor='#1e1e1e', # Dark paper background for contrast
#     font=dict(color='white'), # White font for readability
#     legend=dict(bgcolor='rgba(0,0,0,0)'), # Transparent legend background
#     xaxis=dict(
#         gridcolor='#333', # Dark grid lines
#         tickformat='%b %d', # Displaying only month and day
#         color='white'
#     ),
#     yaxis=dict(
#         gridcolor='#333', # Dark grid lines
#         color='white'
#     )
# )
# plot(fig)

# new_snow_data = pd.read_csv('PT.csv')

# # Convert 'date' column to datetime
# new_snow_data['date'] = pd.to_datetime(new_snow_data['date'])

# # Initialize the figure
# fig = go.Figure()

# # Psychedelic color palette for lines
# psychedelic_colors = ['#9400D3', '#4B0082', '#0000FF', '#00FF00', '#FFFF00', '#FF7F00', '#FF0000']

# # Filtering out non-year columns for SWE data
# year_columns = [col for col in new_snow_data.columns if col.isdigit()]

# # Iterate over each year column to add to the plot with dynamic lines
# for index, year in enumerate(year_columns):
#     fig.add_trace(go.Scatter(
#         x=new_snow_data['date'], 
#         y=new_snow_data[year], 
#         mode='lines', 
#         name=f'SWE {year}',
#         line=dict(width=3, color=psychedelic_colors[index % len(psychedelic_colors)], shape='spline')
#     ))

# # Adding percentile shadings with gradient
# percentile_cols = ['Min', '10%', '30%', '70%', '90%', 'Max']
# gradient_colors = np.linspace(0, 1, len(percentile_cols))

# for i in range(len(percentile_cols)-1):
#     color = (gradient_colors[i], 0, 1-gradient_colors[i]) # Red to Blue gradient
#     fig.add_trace(go.Scatter(
#         x=new_snow_data['date'], 
#         y=new_snow_data[percentile_cols[i]], 
#         fill=None, 
#         mode='lines',
#         line=dict(color=f'rgb({int(color[0]*255)}, {int(color[1]*255)}, {int(color[2]*255)})', width=0),
#         showlegend=False
#     ))
#     fig.add_trace(go.Scatter(
#         x=new_snow_data['date'], 
#         y=new_snow_data[percentile_cols[i+1]], 
#         fill='tonexty', 
#         mode='lines',
#         line=dict(color=f'rgb({int(color[0]*255)}, {int(color[1]*255)}, {int(color[2]*255)})', width=0),
#         showlegend=False
#     ))

# # Add median POR line with a standout color
# fig.add_trace(go.Scatter(
#     x=new_snow_data['date'], 
#     y=new_snow_data['Median (POR)'], 
#     mode='lines', 
#     line=dict(color='white', width=4, dash='dot'),
#     name='Median (POR)'
# ))

# # Psychedelic layout adjustments
# fig.update_layout(
#     title='Psychedelic Snow Water Equivalent (SWE) Visualization',
#     xaxis_title='Date',
#     yaxis_title='SWE (inches)',
#     plot_bgcolor='black', # Deep black background
#     paper_bgcolor='#1e1e1e', # Dark paper background for contrast
#     font=dict(color='white'), # White font for readability
#     legend=dict(bgcolor='rgba(0,0,0,0)'), # Transparent legend background
#     xaxis=dict(
#         gridcolor='#333', # Dark grid lines
#         tickformat='%b %d', # Displaying only month and day
#         color='white'
#     ),
#     yaxis=dict(
#         gridcolor='#333', # Dark grid lines
#         color='white'
#     )
# )
# plot(fig)
# # Display the plot
# fig.show()

# new_snow_data = pd.read_csv('PT.csv')

# # Convert 'date' column to datetime
# new_snow_data['date'] = pd.to_datetime(new_snow_data['date'])

# # Initialize the figure
# fig = go.Figure()

# # Psychedelic color palette for lines
# psychedelic_colors = ['#9400D3', '#4B0082', '#0000FF', '#00FF00', '#FFFF00', '#FF7F00', '#FF0000']

# # Filtering out non-year columns for SWE data
# year_columns = [col for col in new_snow_data.columns if col.isdigit()]

# # Iterate over each year column to add to the plot with dynamic lines
# for index, year in enumerate(year_columns):
#     fig.add_trace(go.Scatter(
#         x=new_snow_data['date'], 
#         y=new_snow_data[year], 
#         mode='lines', 
#         name=f'SWE {year}',
#         line=dict(width=3, color=psychedelic_colors[index % len(psychedelic_colors)], shape='spline')
#     ))

# # Adding percentile shadings with gradient
# percentile_cols = ['Min', '10%', '30%', '70%', '90%', 'Max']
# gradient_colors = np.linspace(0, 1, len(percentile_cols))

# for i in range(len(percentile_cols)-1):
#     # Red to Green to Blue gradient
#     r = 1 - gradient_colors[i] # Red decreases
#     g = gradient_colors[i] if gradient_colors[i] <= 0.5 else 1 - gradient_colors[i] # Green peaks at middle
#     b = gradient_colors[i] # Blue increases
#     fig.add_trace(go.Scatter(
#         x=new_snow_data['date'], 
#         y=new_snow_data[percentile_cols[i]], 
#         fill=None, 
#         mode='lines',
#         line=dict(color=f'rgb({int(r*255)}, {int(g*510)}, {int(b*255)})', width=0),
#         showlegend=False
#     ))
#     fig.add_trace(go.Scatter(
#         x=new_snow_data['date'], 
#         y=new_snow_data[percentile_cols[i+1]], 
#         fill='tonexty', 
#         mode='lines',
#         line=dict(color=f'rgb({int(r*255)}, {int(g*510)}, {int(b*255)})', width=0),
#         showlegend=False
#     ))

# # Add median POR line with a standout color
# fig.add_trace(go.Scatter(
#     x=new_snow_data['date'], 
#     y=new_snow_data['Median (POR)'], 
#     mode='lines', 
#     line=dict(color='white', width=4, dash='dot'),
#     name='Median (POR)'
# ))

# # Psychedelic layout adjustments
# fig.update_layout(
#     title='Psychedelic Snow Water Equivalent (SWE) Visualization',
#     xaxis_title='Date',
#     yaxis_title='SWE (inches)',
#     plot_bgcolor='black', # Deep black background
#     paper_bgcolor='#1e1e1e', # Dark paper background for contrast
#     font=dict(color='white'), # White font for readability
#     legend=dict(bgcolor='rgba(0,0,0,0)'), # Transparent legend background
#     xaxis=dict(
#         gridcolor='#333', # Dark grid lines
#         tickformat='%b %d', # Displaying only month and day
#         color='white'
#     ),
#     yaxis=dict(
#         gridcolor='#333', # Dark grid lines
#         color='white'
#     )
# )
# plot(fig)
# # Display the plot
# fig.show()

# new_snow_data = pd.read_csv('PT.csv')

# # Convert 'date' column to datetime
# new_snow_data['date'] = pd.to_datetime(new_snow_data['date'])

# # Initialize the figure
# fig = go.Figure()

# # Psychedelic color palette for lines
# psychedelic_colors = ['#9400D3', '#4B0082', '#0000FF', '#00FF00', '#FFFF00', '#FF7F00', '#FF0000']

# # Filtering out non-year columns for SWE data
# year_columns = [col for col in new_snow_data.columns if col.isdigit()]

# # Iterate over each year column to add to the plot with dynamic lines
# for index, year in enumerate(year_columns):
#     fig.add_trace(go.Scatter(
#         x=new_snow_data['date'], 
#         y=new_snow_data[year], 
#         mode='lines', 
#         name=f'SWE {year}',
#         line=dict(width=3, color=psychedelic_colors[index % len(psychedelic_colors)], shape='spline')
#     ))

# # Adding percentile shadings with gradient
# percentile_cols = ['Min', '10%', '30%', '70%', '90%', 'Max']
# gradient_colors = np.linspace(0, 1, len(percentile_cols))

# for i in range(len(percentile_cols)-1):
#     # Red to Green to Blue gradient
#     r = 1 - gradient_colors[i] # Red decreases
#     g = gradient_colors[i] if gradient_colors[i] <= 0.5 else 1 - gradient_colors[i] # Green peaks at middle
#     b = gradient_colors[i] # Blue increases
#     fig.add_trace(go.Scatter(
#         x=new_snow_data['date'], 
#         y=new_snow_data[percentile_cols[i]], 
#         fill=None, 
#         mode='lines',
#         line=dict(color=f'rgb({int(r*255)}, {int(g*510)}, {int(b*255)})', width=0),
#         showlegend=False
#     ))
#     fig.add_trace(go.Scatter(
#         x=new_snow_data['date'], 
#         y=new_snow_data[percentile_cols[i+1]], 
#         fill='tonexty', 
#         mode='lines',
#         line=dict(color=f'rgb({int(r*255)}, {int(g*510)}, {int(b*255)})', width=0),
#         showlegend=False
#     ))

# # Add median POR line with a standout color
# fig.add_trace(go.Scatter(
#     x=new_snow_data['date'], 
#     y=new_snow_data['Median (POR)'], 
#     mode='lines', 
#     line=dict(color='white', width=4, dash='dot'),
#     name='Median (POR)'
# ))

# # Psychedelic layout adjustments
# fig.update_layout(
#     title='Psychedelic Snow Water Equivalent (SWE) Visualization',
#     xaxis_title='Date',
#     yaxis_title='SWE (inches)',
#     plot_bgcolor='black', # Deep black background
#     paper_bgcolor='#1e1e1e', # Dark paper background for contrast
#     font=dict(color='white'), # White font for readability
#     legend=dict(bgcolor='rgba(0,0,0,0)'), # Transparent legend background
#     xaxis=dict(
#         gridcolor='#333', # Dark grid lines
#         tickformat='%b %d', # Displaying only month and day
#         color='white'
#     ),
#     yaxis=dict(
#         gridcolor='#333', # Dark grid lines
#         color='white'
#     )
# )
# plot(fig)
# # Display the plot
# fig.show()







































# new_snow_data = pd.read_csv('PT.csv')

# # Convert 'date' column to datetime
# new_snow_data['date'] = pd.to_datetime(new_snow_data['date'])

# # Initialize the figure
# fig = go.Figure()

# # Psychedelic color palette for lines
# psychedelic_colors = ['#9400D3', '#4B0082', '#0000FF', '#00FF00', '#FFFF00', '#FF7F00', '#FF0000']

# # Filtering out non-year columns for SWE data
# year_columns = [col for col in new_snow_data.columns if col.isdigit()]

# # Iterate over each year column to add to the plot with dynamic lines
# for index, year in enumerate(year_columns):
#     fig.add_trace(go.Scatter(
#         x=new_snow_data['date'], 
#         y=new_snow_data[year], 
#         mode='lines', 
#         name=f'SWE {year}',
#         line=dict(width=3, color=psychedelic_colors[index % len(psychedelic_colors)], shape='spline')
#     ))

# # Adding blended percentile shadings
# percentile_cols = ['Min', '10%', '30%', '70%', '90%', 'Max']
# n_gradient_points = 100 # Increase this number for smoother transitions
# gradient_colors = np.linspace(0, 1, n_gradient_points)

# for i in range(len(percentile_cols)-1):
#     for j in range(n_gradient_points):
#         # Red to Green to Blue gradient
#         r = 1 - gradient_colors[j] # Red decreases
#         g = gradient_colors[j] if gradient_colors[j] <= 0.5 else 1 - gradient_colors[j] # Green peaks at middle
#         b = gradient_colors[j] # Blue increases
#         fig.add_trace(go.Scatter(
#             x=new_snow_data['date'], 
#             y=np.linspace(new_snow_data[percentile_cols[i]], new_snow_data[percentile_cols[i+1]], n_gradient_points)[j], 
#             fill='tonexty', 
#             mode='lines',
#             line=dict(color=f'rgb({int(r*255)}, {int(g*510)}, {int(b*255)})', width=0),
#             showlegend=False
#         ))

# # Add median POR line with a standout color
# fig.add_trace(go.Scatter(
#     x=new_snow_data['date'], 
#     y=new_snow_data['Median (POR)'], 
#     mode='lines', 
#     line=dict(color='white', width=4, dash='dot'),
#     name='Median (POR)'
# ))

# # Psychedelic layout adjustments
# fig.update_layout(
#     title='Psychedelic Snow Water Equivalent (SWE) Visualization',
#     xaxis_title='Date',
#     yaxis_title='SWE (inches)',
#     plot_bgcolor='black', # Deep black background
#     paper_bgcolor='#1e1e1e', # Dark paper background for contrast
#     font=dict(color='white'), # White font for readability
#     legend=dict(bgcolor='rgba(0,0,0,0)'), # Transparent legend background
#     xaxis=dict(
#         gridcolor='#333', # Dark grid lines
#         tickformat='%b %d', # Displaying only month and day
#         color='white'
#     ),
#     yaxis=dict(
#         gridcolor='#333', # Dark grid lines
#         color='white'
#     )
# )

# # Display the plot
# plot(fig)


















# new_snow_data = pd.read_csv('PT.csv')

# # Convert 'date' column to datetime
# new_snow_data['date'] = pd.to_datetime(new_snow_data['date'])

# # Initialize the figure
# fig = go.Figure()

# # Psychedelic color palette for lines
# psychedelic_colors = ['#9400D3', '#4B0082', '#0000FF', '#00FF00', '#FFFF00', '#FF7F00', '#FF0000']

# # Filtering out non-year columns for SWE data
# year_columns = [col for col in new_snow_data.columns if col.isdigit()]

# # Iterate over each year column to add to the plot with dynamic lines
# for index, year in enumerate(year_columns):
#     fig.add_trace(go.Scatter(
#         x=new_snow_data['date'], 
#         y=new_snow_data[year], 
#         mode='lines', 
#         name=f'SWE {year}',
#         line=dict(width=3, color=psychedelic_colors[index % len(psychedelic_colors)], shape='spline')
#     ))

# # Adding blended percentile shadings
# percentile_cols = ['Min', '10%', '30%', '70%', '90%', 'Max']
# n_gradient_points = 100 # Increase this number for smoother transitions
# gradient_colors = np.linspace(0, 1, n_gradient_points)

# for i in range(len(percentile_cols)-1):
#     for j in range(n_gradient_points):
#         # Red to Green to Blue gradient
#         r = 1 - gradient_colors[j] # Red decreases
#         g = gradient_colors[j] if gradient_colors[j] <= 0.5 else 1 - gradient_colors[j] # Green peaks at middle
#         b = gradient_colors[j] # Blue increases
#         fig.add_trace(go.Scatter(
#             x=new_snow_data['date'], 
#             y=np.linspace(new_snow_data[percentile_cols[i]], new_snow_data[percentile_cols[i+1]], n_gradient_points)[j], 
#             fill='tonexty', 
#             mode='lines',
#             line=dict(color=f'rgb({int(r*255)}, {int(g*510)}, {int(b*255)})', width=0),
#             showlegend=False
#         ))

# # Add median POR line with a standout color
# fig.add_trace(go.Scatter(
#     x=new_snow_data['date'], 
#     y=new_snow_data['Median (POR)'], 
#     mode='lines', 
#     line=dict(color='white', width=4, dash='dot'),
#     name='Median (POR)'
# ))

# # Psychedelic layout adjustments
# fig.update_layout(
#     title='Psychedelic Snow Water Equivalent (SWE) Visualization',
#     xaxis_title='Date',
#     yaxis_title='SWE (inches)',
#     plot_bgcolor='black', # Deep black background
#     paper_bgcolor='#1e1e1e', # Dark paper background for contrast
#     font=dict(color='white'), # White font for readability
#     legend=dict(bgcolor='rgba(0,0,0,0)'), # Transparent legend background
#     xaxis=dict(
#         gridcolor='#333', # Dark grid lines
#         tickformat='%b %d', # Displaying only month and day
#         color='white'
#     ),
#     yaxis=dict(
#         gridcolor='#333', # Dark grid lines
#         color='white'
#     )
# )

# # Display the plot
# plot(fig)










# new_snow_data = pd.read_csv('PT.csv')

# # Convert 'date' column to datetime
# new_snow_data['date'] = pd.to_datetime(new_snow_data['date'])

# # Initialize the figure
# fig = go.Figure()

# # Psychedelic color palette for lines
# psychedelic_colors = ['#9400D3', '#4B0082', '#0000FF', '#00FF00', '#FFFF00', '#FF7F00', '#FF0000']

# # Filtering out non-year columns for SWE data
# year_columns = [col for col in new_snow_data.columns if col.isdigit()]

# # Iterate over each year column to add to the plot with dynamic lines
# for index, year in enumerate(year_columns):
#     fig.add_trace(go.Scatter(
#         x=new_snow_data['date'], 
#         y=new_snow_data[year], 
#         mode='lines', 
#         name=f'SWE {year}',
#         line=dict(width=3, color=psychedelic_colors[index % len(psychedelic_colors)], shape='spline')
#     ))

# # Adding blended percentile shading across the entire range
# percentile_cols = ['Min', '10%', '30%', '70%', '90%', 'Max']
# n_gradient_points = len(percentile_cols) - 1
# gradient_colors = np.linspace(0, 1, n_gradient_points)

# for i in range(n_gradient_points):
#     # Red to Green to Blue gradient for the entire range
#     r = 1 - gradient_colors[i] # Red decreases
#     g = gradient_colors[i] if gradient_colors[i] <= 0.5 else 1 - gradient_colors[i] # Green peaks at middle
#     b = gradient_colors[i] # Blue increases
#     fig.add_trace(go.Scatter(
#         x=new_snow_data['date'], 
#         y=new_snow_data[percentile_cols[i]], 
#         fill=None, 
#         mode='lines',
#         line=dict(color=f'rgb({int(r*255)}, {int(g*510)}, {int(b*255)})', width=0),
#         showlegend=False
#     ))
#     fig.add_trace(go.Scatter(
#         x=new_snow_data['date'], 
#         y=new_snow_data[percentile_cols[i+1]], 
#         fill='tonexty', 
#         mode='lines',
#         line=dict(color=f'rgb({int(r*255)}, {int(g*510)}, {int(b*255)})', width=0),
#         showlegend=False
#     ))

# # Add median POR line with a standout color
# fig.add_trace(go.Scatter(
#     x=new_snow_data['date'], 
#     y=new_snow_data['Median (POR)'], 
#     mode='lines', 
#     line=dict(color='white', width=4, dash='dot'),
#     name='Median (POR)'
# ))

# # Psychedelic layout adjustments
# fig.update_layout(
#     title='Psychedelic Snow Water Equivalent (SWE) Visualization',
#     xaxis_title='Date',
#     yaxis_title='SWE (inches)',
#     plot_bgcolor='black', # Deep black background
#     paper_bgcolor='#1e1e1e', # Dark paper background for contrast
#     font=dict(color='white'), # White font for readability
#     legend=dict(bgcolor='rgba(0,0,0,0)'), # Transparent legend background
#     xaxis=dict(
#         gridcolor='#333', # Dark grid lines
#         tickformat='%b %d', # Displaying only month and day
#         color='white'
#     ),
#     yaxis=dict(
#         gridcolor='#333', # Dark grid lines
#         color='white'
#     )
# )

# # Display the plot
# plot(fig)



# new_snow_data = pd.read_csv('PT.csv')

# # Convert 'date' column to datetime
# new_snow_data['date'] = pd.to_datetime(new_snow_data['date'])

# # Initialize the figure
# fig = go.Figure()

# # Psychedelic color palette for lines
# psychedelic_colors = ['#9400D3', '#4B0082', '#0000FF', '#00FF00', '#FFFF00', '#FF7F00', '#FF0000']

# # Filtering out non-year columns for SWE data
# year_columns = [col for col in new_snow_data.columns if col.isdigit()]

# # Iterate over each year column to add to the plot with dynamic lines
# for index, year in enumerate(year_columns):
#     fig.add_trace(go.Scatter(
#         x=new_snow_data['date'], 
#         y=new_snow_data[year], 
#         mode='lines', 
#         name=f'SWE {year}',
#         line=dict(width=3, color=psychedelic_colors[index % len(psychedelic_colors)], shape='spline')
#     ))

# # Adding blended percentile shading across the entire range
# percentile_cols = ['Min', '10%', '30%', '70%', '90%', 'Max']
# n_gradient_points = 1000 # Increase for smoother gradient
# full_gradient = np.linspace(0, 1, n_gradient_points)

# # Function to calculate the RGB value based on position in the gradient
# def calculate_rgb(position):
#     r = 1 - position # Red decreases
#     g = position if position <= 0.5 else 1 - position # Green peaks at middle
#     b = position # Blue increases
#     return f'rgb({int(r*255)}, {int(g*510)}, {int(b*255)})'

# # Determine the range of values for the percentiles
# percentile_values = [new_snow_data[col] for col in percentile_cols]

# # Apply the gradient across the entire percentile range
# for i in range(n_gradient_points - 1):
#     start_percentile = np.interp(i, np.linspace(0, n_gradient_points, len(percentile_cols)), percentile_values)
#     end_percentile = np.interp(i + 1, np.linspace(0, n_gradient_points, len(percentile_cols)), percentile_values)
#     fig.add_trace(go.Scatter(
#         x=new_snow_data['date'], 
#         y=start_percentile,
#         fill='tonexty', 
#         mode='lines',
#         line=dict(color=calculate_rgb(full_gradient[i]), width=0),
#         showlegend=False
#     ))

# # Add median POR line with a standout color
# fig.add_trace(go.Scatter(
#     x=new_snow_data['date'], 
#     y=new_snow_data['Median (POR)'], 
#     mode='lines', 
#     line=dict(color='white', width=4, dash='dot'),
#     name='Median (POR)'
# ))

# # Psychedelic layout adjustments
# fig.update_layout(
#     title='Psychedelic Snow Water Equivalent (SWE) Visualization',
#     xaxis_title='Date',
#     yaxis_title='SWE (inches)',
#     plot_bgcolor='black', # Deep black background
#     paper_bgcolor='#1e1e1e', # Dark paper background for contrast
#     font=dict(color='white'), # White font for readability
#     legend=dict(bgcolor='rgba(0,0,0,0)'), # Transparent legend background
#     xaxis=dict(
#         gridcolor='#333', # Dark grid lines
#         tickformat='%b %d', # Displaying only month and day
#         color='white'
#     ),
#     yaxis=dict(
#         gridcolor='#333', # Dark grid lines
#         color='white'
#     )
# )

# # Display the plot
# plot(fig)

# new_snow_data = pd.read_csv('PT.csv')

# # Convert 'date' column to datetime
# new_snow_data['date'] = pd.to_datetime(new_snow_data['date'])

# # Initialize the figure
# fig = go.Figure()

# # Psychedelic color palette for lines
# psychedelic_colors = ['#9400D3', '#4B0082', '#0000FF', '#00FF00', '#FFFF00', '#FF7F00', '#FF0000']

# # Filtering out non-year columns for SWE data
# year_columns = [col for col in new_snow_data.columns if col.isdigit()]

# # Iterate over each year column to add to the plot with dynamic lines
# for index, year in enumerate(year_columns):
#     fig.add_trace(go.Scatter(
#         x=new_snow_data['date'], 
#         y=new_snow_data[year], 
#         mode='lines', 
#         name=f'SWE {year}',
#         line=dict(width=3, color=psychedelic_colors[index % len(psychedelic_colors)], shape='spline')
#     ))

# # Adding blended percentile shading across the entire range
# percentile_cols = ['Min', '10%', '30%', '70%', '90%', 'Max']
# n_gradient_points = 1000  # Increase for smoother gradient
# full_gradient = np.linspace(0, 1, n_gradient_points)

# # Function to calculate the RGB value based on position in the gradient
# def calculate_rgb(position):
#     r = 1 - position  # Red decreases
#     g = position if position <= 0.5 else 1 - position  # Green peaks at middle
#     b = position  # Blue increases
#     return f'rgb({int(r*255)}, {int(g*510)}, {int(b*255)})'

# # Apply the gradient across the entire percentile range
# for i in range(n_gradient_points - 1):
#     color = calculate_rgb(full_gradient[i])
#     # Interpolating percentile values
#     lower_bound = np.interp(full_gradient[i], np.linspace(0, 1, len(percentile_cols)), new_snow_data[percentile_cols])
#     upper_bound = np.interp(full_gradient[i+1], np.linspace(0, 1, len(percentile_cols)), new_snow_data[percentile_cols])
#     fig.add_trace(go.Scatter(
#         x=new_snow_data['date'], 
#         y=lower_bound,
#         fill='tonexty', 
#         mode='lines',
#         line=dict(color=color, width=0),
#         fillcolor=color,
#         showlegend=False
#     ))

# # Add median POR line with a standout color
# fig.add_trace(go.Scatter(
#     x=new_snow_data['date'], 
#     y=new_snow_data['Median (POR)'], 
#     mode='lines', 
#     line=dict(color='white', width=4, dash='dot'),
#     name='Median (POR)'
# ))

# # Psychedelic layout adjustments
# fig.update_layout(
#     title='Psychedelic Snow Water Equivalent (SWE) Visualization',
#     xaxis_title='Date',
#     yaxis_title='SWE (inches)',
#     plot_bgcolor='black',  # Deep black background
#     paper_bgcolor='#1e1e1e',  # Dark paper background for contrast
#     font=dict(color='white'),  # White font for readability
#     legend=dict(bgcolor='rgba(0,0,0,0)'),  # Transparent legend background
#     xaxis=dict(
#         gridcolor='#333',  # Dark grid lines
#         tickformat='%b %d',  # Displaying only month and day
#         color='white'
#     ),
#     yaxis=dict(
#         gridcolor='#333',  # Dark grid lines
#         color='white'
#     )
# )
# plot(fig)
