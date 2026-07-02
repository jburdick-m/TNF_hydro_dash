"""
Use Python+Plotly+Dash combination to make a workable version of the snow pillow records plots
Just a sandbox for now
Author: Jacob Kollen
Date the tankering started: 20230621
"""

#%% USER INPUTS
str_base_dir = 'S://HAFOO//HYDRO//SNOW//data//'

str_data_pull = '1900-10-01'

#%% IMPORT ADDITIONAL PACKAGES
import os
import sys 
import numpy as np
import pandas as pd
import plotly
import plotly.express as px
sys.path.insert(1, str_base_dir + 'Python_scripts//PY_CUSTOM_FUNCTIONS') # this enables us to load our custom functions
from FUNC_CDEC_PULL import FUNC_CDEC_PULL


#%% SET THE WORKING DIRECTORY
str_wd = (str_base_dir 
          + 'Python_scripts//BreakingSnowRecords_Plots_2023')  # define the string to the working directory
os.chdir(str_wd)  # this changes the working directory


#%% LOAD KEYS FROM LOCAL DRIVE 
df_key = pd.read_csv('Snow_Pillow_BreakingRecords_Key_v3.csv')


#%% DEFINE SOME DATETIME BASED VARIABLES
dt_today = pd.Timestamp.today().floor('D')
str_today = dt_today.strftime('%Y-%m-%d')


#%% PULL DATA FROM CDEC

df_key.columns
df = pd.DataFrame()

for index,row in df_key.iterrows():
    df_temp = FUNC_CDEC_PULL(str_stn = row['STATION_ID'],
                             str_interval = 'D',
                             str_id = '82',
                             str_startdate = str_data_pull,
                             str_enddate = str_today)
    
    df_temp = df_temp.rename(columns={'DATE TIME':'DATE'})
    df_temp['VARIABLE'] = 'SNOW WATER CONTENT'
    df_temp = df_temp[['STATION_ID','DATE','VARIABLE','VALUE','UNITS']]
    df_temp['DATE']

 # df <- df[,c('DATE.TIME','VALUE')]
 #  df$DATETIME <- as.POSIXct(df$DATE.TIME, format='%Y%m%d %H%M')
 #  df$DAYOFYEAR <- yday(df$DATETIME)
 #  df$DAYOFMONTH <- mday(df$DATETIME)
 #  df$MONTHOFYEAR <- month(df$DATETIME)
 #  df$YEAR <- year(df$DATETIME)
 #  df$WATERYEAR <- year(df$DATETIME)
 #  df$WATERYEAR <- ifelse(df$MONTHOFYEAR >= 10,year(df$DATETIME)+1,year(df$DATETIME))
 #  df <- subset(df, MONTHOFYEAR != 2 | DAYOFMONTH != 29)
 #  df$DAYOFYEAR <- ifelse(leap_year(df$YEAR) & df$DAYOFYEAR >60,df$DAYOFYEAR-1,df$DAYOFYEAR)
 #  df$DAYOFWATERYEAR <- ifelse(df$MONTHOFYEAR >= 10,df$DAYOFYEAR - 273,df$DAYOFYEAR + 92)



    
    df = pd.concat([df,df_temp])
    

    

