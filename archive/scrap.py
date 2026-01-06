# -*- coding: utf-8 -*-
"""
Created on Fri Nov 17 14:20:52 2023

@author: jburdick
"""



fig = go.Figure()
fig.update_layout(
    title_text = 'Forecasted Precip for Nevada City, CA elev. 3700', title_x=0.5,
    yaxis_title = 'PPT(in)',
    xaxis_title = 'Period',
    legend=dict(
                yanchor="top",
                y=1,
                xanchor="left",
                x=1.065
                )
    )
fig.add_trace(go.Bar(
    x=totals_df['period'], 
    y=totals_df['total_ppt'],
    showlegend = False,
))
plot(fig)
# batt_fig = px.line(batt_df, x='TIMESTAMP', y='voltage', color = 'site')


#     fig.add_trace(go.Bar(
#         x = df_NADP[(df_NADP['TIMESTAMP']>= min_date) & (df_NADP['TIMESTAMP']<= max_date)]['TIMESTAMP'], y = df_NADP[df_NADP['TIMESTAMP']>= min_date]['ReportPCP'],
#         visible = 'legendonly',
#         yaxis = 'y2',
#         name = 'NADP NOAHIV'
#         ))

hr_tot = df['qpf'].sum()
24hr_tot
48hr_tot
72hr_tot
df_12hr =     

df_day_tot = df.resample('D').sum()
    
    for i in df_wt.index:
        df_wt.loc[i, 'dayofyear'] = df_wt.loc[i, 'datetime'].dayofyear

# check_df['datetime'] = pd.to_datetime(check_df['datetime'], format = '%m/%d/%Y %H%M')



df = pd.DataFrame(row_data)
    df.columns = 


st_dt.strptime('%Y-%m-%d_%h:%m:%s')

st_dt.strftime('%Y-%m-%d_%h:%m:%s')






    

        
for child in root[1]:
    time_data = []
    for value in child[1]:
        time_data.append(value.text)
        
date_time = []
date_time.append()

        

        



#columns = [col.attrib['friendlyName'] for col in root.find('columns')]
columns = ['hourly-qpf']
for row in root.find('rows'):
    print()
    row_data = {} for col in row: # Add the data for each column to the dictionary row_data[col.attrib['name']] = col.text # Add the dictionary for this row to the list data.append(row_data)

for row in root.find('rows'): row_data = {} for col in row: # Add the data for each column to the dictionary row_data[col.attrib['name']] = col.text # Add the dictionary for this row to the list data.append(row_data)
root = tree.getroot()
print (root[].tag)

for child in root[1]:
    print(child.tag)
        
for child in root[1]:
    for value in child[0]:
        print(value)

for x in root:
    print(x)
for x in root.findall('data'):
    print(x)


\df_key <- read.csv('Snow_Pillow_BreakingRecords_Key_v3.csv')

CDEC_Pull <- function(var_stns,var_period,var_sensorid,var_startdate,var_enddate){
  df <- data.frame()
  URL1 = "https://cdec.water.ca.gov/dynamicapp/req/CSVDataServlet?Stations="
  URL2 = 'CSL' #stationID
  URL3 <- "&SensorNums="
  URL4 <- var_sensorid #sensorID
  URL5 <- "&dur_code="
  URL6 <- var_period
  URL7 <- "&Start="
  URL8 <- var_startdate
  URL9 <- "&End="
  URL10 <- var_enddate
  URL <- paste(URL1,URL2,URL3,URL4,URL5,URL6,URL7,URL8,URL9,URL10,sep='')
  df <- read.csv(URL, na.strings='---')
  
  
  df <- df[,c('DATE.TIME','VALUE')]
  df$DATETIME <- as.POSIXct(df$DATE.TIME, format='%Y%m%d %H%M')
  df$DAYOFYEAR <- yday(df$DATETIME)
  df$DAYOFMONTH <- mday(df$DATETIME)
  df$MONTHOFYEAR <- month(df$DATETIME)
  df$YEAR <- year(df$DATETIME)
  df$WATERYEAR <- year(df$DATETIME)
  df$WATERYEAR <- ifelse(df$MONTHOFYEAR >= 10,year(df$DATETIME)+1,year(df$DATETIME))
  df <- subset(df, MONTHOFYEAR != 2 | DAYOFMONTH != 29)
  df$DAYOFYEAR <- ifelse(leap_year(df$YEAR) & df$DAYOFYEAR >60,df$DAYOFYEAR-1,df$DAYOFYEAR)
  df$DAYOFWATERYEAR <- ifelse(df$MONTHOFYEAR >= 10,df$DAYOFYEAR - 273,df$DAYOFYEAR + 92)
  
  df <- df %>%
    mutate(CDATE=as.Date(paste0(ifelse(MONTHOFYEAR < 10, "1901", "1900"),
                                "-", MONTHOFYEAR, "-", DAYOFMONTH)))
  
  df <- df %>% drop_na(VALUE)
  
  df$VALUE <- ifelse(df$VALUE < 0, 0, df$VALUE)
  
  df <- subset(df,DAYOFWATERYEAR > 31 & DAYOFWATERYEAR < 274 )
  
  return(df)
}

# var_stns <- 'BSK' # this is the unique station three letter code, here is a handy map app: https://cdec.water.ca.gov/webgis/?appid=cdecstation
var_period <- 'D' # time period, 'H' = hourly, 'M' = monthly ... event data also exists 
var_sensorid <- '82' # https://cdec.water.ca.gov/reportapp/javareports?name=SensList
var_startdate <- '1900-10-01' # start query at this date
current_date <- as.Date(Sys.Date())
var_enddate <- current_date # end query at this date
# var_stns <- 'CSL'

df_key['YEAR_RECORD_BEGAN'] <- NA

df_key['RECORD_YN'] <- NA

df_key['PREVIOUS_RECORD'] <- NA

df_key['CURRENT_YEAR_MAX'] <- NA

df_key['RECORD_MAY_YN'] <- NA

df_key['PREVIOUS_MAY_RECORD'] <- NA

df_key['CURRENT_YEAR_MAY'] <- NA




for (i in 1:nrow(df_key)) {
  
  var_stns <- df_key[i,'STATION_ID']
  
  stn_name <- df_key[i,'STATION']
  
  stn_code <- var_stns
  
  stn_elev <- df_key[i,'ELEV_FT']
  
  df <- CDEC_Pull(var_stns,var_period,var_sensorid,var_startdate,var_enddate)

  record_start_dt <- as.Date(subset(df,DATETIME == min(DATETIME))[,'DATETIME'])
  
  record_start <- as.character(record_start_dt,format='%Y-%m-%d')
  
  record_pulled <- as.character(current_date,format='%Y-%m-%d')
  
  por_length <- length(seq(from=record_start_dt,to=current_date,by='year'))-1

  last_record_dt <- as.Date(subset(df,DATETIME == max(DATETIME))[,'DATETIME'])
  
  april_first_dt <- as.Date('2023-04-01',format = '%Y-%m-%d')

  may_first_dt <- as.Date('2023-05-01',format = '%Y-%m-%d')
  

  if (por_length < 10){
    # paste0('For station: ',var_stns,', the period of record is smaller than 10 years and is not considered')
    df_key[i, 'RECORD_YN'] <- 'Period of record is less than 10 years and this station was not considered'
  } else if (last_record_dt < april_first_dt){
    # paste0('For station: ',var_stns,', the latest record was before April 1st of this year and is not considered')
    df_key[i, 'RECORD_YN'] <- 'Latest data entry was before April 1st of 2023 and this station was not considered, sensor likely is down'
  } else {

    df_current <- subset(df,WATERYEAR == 2023)
    
    current_yr_max = max(df_current$VALUE)
    
    df_past <- subset(df,WATERYEAR < 2023)
    
    current_yr_may1_temp = subset(df_current, DATETIME == may_first_dt)
    
    current_yr_may1 = current_yr_may1_temp$VALUE
    
    df_past <- df_past[,c('MONTHOFYEAR','DAYOFMONTH','DAYOFWATERYEAR','CDATE','VALUE')]
    
    df_past_2 <- df_past %>%
      group_by(MONTHOFYEAR,DAYOFMONTH,DAYOFWATERYEAR,CDATE) %>%
      summarize(mean_val = mean(VALUE),
                max_val = max(VALUE),
                min_val = min(VALUE),
                q10 = quantile(VALUE, probs = 0.1, na.rm=FALSE),
                q25 = quantile(VALUE, probs = 0.25, na.rm=FALSE),
                q50 = quantile(VALUE, probs = 0.5, na.rm=FALSE),
                q75 = quantile(VALUE, probs = 0.75, na.rm=FALSE),
                q90 = quantile(VALUE, probs = 0.9, na.rm=FALSE))
    
    previous_yrs_max = max(df_past_2$max_val)
    
    previous_yrs_may1_max_temp = subset(df_past_2, MONTHOFYEAR==5&DAYOFMONTH==1)
    
    previous_yrs_may1_max = previous_yrs_may1_max_temp$max_val
    
    background_fill = ifelse(current_yr_max>=previous_yrs_max,'#edf8e0','#ffffff')

    p = ggplot(data=df_past_2) +
      geom_ribbon(aes(x=CDATE,ymin=min_val,ymax=max_val,fill='max and min'),alpha=1)+
      geom_ribbon(aes(x=CDATE,ymin=q90,ymax=q10,fill='q90 and q10'),alpha=1)+
      geom_ribbon(aes(x=CDATE,ymin=q75,ymax=q25,fill='q75 and q25'),alpha=1)+
      geom_line(aes(x=CDATE,y=q50,color='median'),linewidth=1)+
      # geom_line(aes(x=CDATE,y=mean_val,color='mean'),linewidth=1,)+
      geom_line(data=df_current,aes(x=CDATE,y=VALUE,color='current'),linewidth=1.2)+
      scale_fill_manual(name='',breaks=c('max and min','q90 and q10','q75 and q25'),
                        values=c('max and min'='#dadedf','q75 and q25'='#a7afb2','q90 and q10'='#c1c7c9'))+
      scale_color_manual(name='',values=c('median'='#fde725','current'='#440154'))+
      # scale_color_manual(name='',values=c('median'='#fde725','mean'='#21918c','current'='#440154'))+
      labs(title=paste0(stn_name,', ',stn_code),
           subtitle = paste0('Current Year Max = ', current_yr_max,' in, Previous Years Max = ',previous_yrs_max,' in'),
           caption=paste0('Elevation = ',stn_elev,' ft, Start of Record = ',record_start,', Record Pulled = ',record_pulled),
           x='Time',
           y='SWE (in)')+
      scale_x_date(date_labels = "%b %d", breaks='1 month')+
      theme_bw()+
      theme(panel.background = element_rect(fill = background_fill, color='white'))

    p

    ggsave(filename=paste0('SNOW_PILLOW_PLOTS\\',stn_code,'_',current_date,'_v4.pdf'),plot=p,width=6,height=3,units='in',dpi=200)

    
    record_yn_string <- ifelse(current_yr_max>=previous_yrs_max,'Yes','No') 
    
    df_key[i,'YEAR_RECORD_BEGAN'] <- year(record_start)
    
    df_key[i, 'RECORD_YN'] <- record_yn_string 
    
    df_key[i, 'PREVIOUS_RECORD'] <- previous_yrs_max 
    
    df_key[i, 'CURRENT_YEAR_MAX'] <- current_yr_max 
    
    
    
    if (is_empty(current_yr_may1) == TRUE){
      paste0('For station: ',var_stns,', the May 1st 2023 value is absent and is not considered May1 max summary')
      df_key[i, 'RECORD_MAY_YN'] <- 'The May 1st 2023 value is absent and is not considered in the May 1 summary'
    # } else if (last_record_dt <= april_first_dt){
    #   paste0('For station: ',var_stns,', the latest record was before April 1st of this year and is not considered')
    #   df_key[i, 'RECORD_YN'] <- 'Latest record was before April 1st of 2023 and this station was not considered'
      } else {
      
      record_may_yn_string <- ifelse(current_yr_may1>=previous_yrs_may1_max,'Yes','No') 
      
      df_key[i,'RECORD_MAY_YN'] <- record_may_yn_string
      
      df_key[i,'PREVIOUS_MAY_RECORD'] <- previous_yrs_may1_max
      
      df_key[i,'CURRENT_YEAR_MAY'] <- current_yr_may1
      }
    }
}

write.csv(df_key,paste0('SNOW_PILLOW_PLOTS\\pillow_records_table_',as.character(current_date,format='%Y%m%d'),'_v4.csv'))




str_wd = ('C:\\Users\\jburdick\\Box\\01. jacob.burdick Workspace\\Documents\\TNF dashboard\\SnowPillow_QuantileRibbonPlots_202306')  # define the string to the working directory
os.chdir(str_wd)
df_key = pd.read_csv('Snow_Pillow_BreakingRecords_Key_v3.csv')
dt_today = pd.Timestamp.today().floor('D')
str_today = dt_today.strftime('%Y-%m-%d')


df_temp = FUNC_CDEC_PULL(str_stn = row['STATION_ID'],
                         str_interval = 'D',
                         str_id = '82',
                         str_startdate = str_data_pull,
                         str_enddate = str_today)

df_temp = df_temp.rename(columns={'DATE TIME':'DATE'})
df_temp['VARIABLE'] = 'SNOW WATER CONTENT'
df_temp = df_temp[['STATION_ID','DATE','VARIABLE','VALUE','UNITS']]
df_temp['DATE']



























#load real time data 
filepaths = {'C:\\Users\\'+ user + '\\Box\\External-MEF_DATA\\DataDump\\RealTimeData\\S6_bogwell_S6BW.dat':'S6',
             'C:\\Users\\'+ user + '\\Box\\External-MEF_DATA\\DataDump\\annual_appended_logger_files\\2020\\S4_bogwell_S4BW.dat':'S4',
             'C:\\Users\\'+ user + '\\Box\\External-MEF_DATA\\DataDump\\RealTimeData\\S3_fenwell_S3FW.dat':'S3',
             'C:\\Users\\'+ user + '\\Box\\External-MEF_DATA\\DataDump\\RealTimeData\\S2_bogwell_S2BW.dat':'S2',
             'C:\\Users\\'+ user + '\\Box\\External-MEF_DATA\\DataDump\\RealTimeData\\S1-EM3_Table1.dat':'S1', 
             'C:\\Users\\'+ user + '\\Box\\External-MEF_DATA\\DataDump\\annual_appended_logger_files\\2020\\S5_bogwell_S5BW.dat':'S5',
             'C:\\Users\\'+ user + '\\Box\\External-MEF_DATA\\DataDump\\RealTimeData\\BLF_met_BogLakeW.dat':'BOGLK'}
df_wts = pd.DataFrame()

k = 'C:\\Users\\' + user + '\\Box\\External-MEF_DATA\\DataDump\\RealTimeData\\S2_bogwell_S2BWMet.dat'
 
for k,v in filepaths.items():
    df_wt = pd.read_csv(k, skiprows = [0,2,3], na_values=('NAN'), header = 0, engine = 'python', parse_dates = True)
    df_wt=df_wt.assign(datetime=pd.to_datetime(df_wt.TIMESTAMP,errors='coerce'))
    df_wt['dayofyear'] = ''
    #assign day of year based on date
    for i in df_wt.index:
        df_wt.loc[i, 'dayofyear'] = df_wt.loc[i, 'datetime'].dayofyear
        #df_wt['dayofyear'][i] = df_wt['datetime'][i].dayofyear
    #initialize quantile columns
    df_wt['min'] = ''
    df_wt['max'] = ''
    df_wt['10']= ''
    df_wt['25']= ''
    df_wt['50']= ''
    df_wt['75']= ''
    df_wt['90']= ''

    #i=1
    for i in df_quant.index:     #assign quantile values to day of year by site
        df_wt.loc[df_wt.dayofyear == i, 'min'] = data[data['PEATLAND'] == v]['min'][i]
        df_wt.loc[df_wt.dayofyear == i, 'max'] = data[data['PEATLAND'] == v]['max'][i]
        df_wt.loc[df_wt.dayofyear == i, '10'] = data[data['PEATLAND'] == v]['10'][i]
        df_wt.loc[df_wt.dayofyear == i, '25'] = data[data['PEATLAND'] == v]['25'][i]
        df_wt.loc[df_wt.dayofyear == i, '50'] = data[data['PEATLAND'] == v]['50'][i]
        df_wt.loc[df_wt.dayofyear == i, '75'] = data[data['PEATLAND'] == v]['75'][i]
        df_wt.loc[df_wt.dayofyear == i, '90'] = data[data['PEATLAND'] == v]['90'][i]
    
    #convert ft to meters
    df_wt['PEATLAND'] = v
    df_wts = pd.concat([df_wts, df_wt]) #df_wts.concat(df_wt)
df_wts['WT_e'] = df_wts['WTElev'].fillna(0) + df_wts['WT_Elev'].fillna(0)
df_wts['WT_m'] = df_wts['WT_e'] * .3048
df_wtt = df_wts[['datetime', 'PEATLAND','WT_e','WT_m', 'dayofyear', 'min', 'max', '10', '25', '50', '75', '90']]
df_wtt.reset_index(inplace = True)
for i in df_wtt.index: #replace any zeros or blank values with nan
    if df_wtt.loc[i,'WT_m'] in [0, '0', '']:
        df_wtt.loc[i,'WT_m'] = np.nan


''
#Build WT context plot
for val_chosen in ['BOGLK', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6']:
    dff = df_wtt[df_wtt["PEATLAND"] == val_chosen]
    min_date = dff['datetime'].min()
    max_date = dff['datetime'].max()
    fig = go.Figure()
    fig.update_layout(
        title_text = 'Peatland water table elevation at ' + val_chosen + ' peatland and seasonal historic water table range', title_x=0.5,
        yaxis_title = 'Water table elevation (m)',
        xaxis_title = 'Date',
        yaxis2=dict(
                    title = 'daily precip (in)',
                    overlaying='y',
                    side='right',
                    automargin = True,
                    range = [0,3]
                    ),
        legend=dict(
                    yanchor="top",
                    y=1,
                    xanchor="left",
                    x=1.065
                    )
        )
    fig.add_trace(go.Bar(
        x = df_NADP[(df_NADP['TIMESTAMP']>= min_date) & (df_NADP['TIMESTAMP']<= max_date)]['TIMESTAMP'], y = df_NADP[df_NADP['TIMESTAMP']>= min_date]['ReportPCP'],
        visible = 'legendonly',
        yaxis = 'y2',
        name = 'NADP NOAHIV'
        ))
    #fig.update_yaxes(title_text="daily precip (in)", secondary_y=True)
    fig.add_trace(go.Scatter(
        x=dff['datetime'], 
        y= signal.savgol_filter(dff['min'], # smoothes data because day of year repeated over multiple times a day
                                53, # window size used for filtering
                                3), # order of fitted polynomial ,
        hoverinfo='skip',
        mode='lines',
        showlegend = False,
        line=dict(width=0, color='rgb(131, 90, 241)'),
        fill = None # define stack group
    ))
    fig.add_trace(go.Scatter(
        x=dff['datetime'], y= signal.savgol_filter(dff['10'],
                               53, # window size used for filtering
                               3), # order of fitted polynomial ,
        hoverinfo='skip',
        mode='lines',
        name = 'min-10th percentile',
        line=dict(width=0, color='indianred'),
        fill = 'tonexty'
    ))
    fig.add_trace(go.Scatter(
        x=dff['datetime'], y= signal.savgol_filter(dff['25'],
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
        x=dff['datetime'], y= signal.savgol_filter(dff['75'],
                               53, # window size used for filtering
                               3), # order of fitted polynomial ,
        name = '25-75th percentile',
        mode='lines',
        hoverinfo = 'skip',
        line=dict(width=0, color='darkseagreen'),
        fill = 'tonexty'
    ))
    fig.add_trace(go.Scatter(
        x=dff['datetime'], y= signal.savgol_filter(dff['90'],
                               53, # window size used for filtering
                               3), # order of fitted polynomial ,
        name = '75-90th percentile',
        mode='lines',
        hoverinfo = 'skip',
        line=dict(width=0, color='cornflowerblue'),
        fill = 'tonexty'
    ))
    
    fig.add_trace(go.Scatter(
        x=dff['datetime'], y= signal.savgol_filter(dff['max'],
                               53, # window size used for filtering
                               3), # order of fitted polynomial ,
        name = '90th percentile-max',
        hoverinfo = 'skip',
        mode='lines',
        line=dict(width=0, color='darkblue'),
        fill = 'tonexty'
    ))
    
    #median line
    fig.add_trace(go.Scatter(
        x=dff['datetime'], y= signal.savgol_filter(dff['50'],
                               53, # window size used for filtering
                               4), # order of fitted polynomial ,
        name = 'median',
        mode='lines',
        line=dict(width=2, dash = 'dot', color='dimgrey'),
    ))
    
    #wtelev line
    fig.add_trace(go.Scatter(
        x=dff['datetime'], y= dff['WT_m'],
        name = val_chosen + '_WT',
        mode='lines',
        line=dict(width=2, color='black'),
    ))
    locals()[val_chosen + '_fig'] = fig
    
fig.write_html('C:/Users/'+ user + '/Box/External MEF-WORKSPACE/Realtime_sensor_figures/water_table_elev_S6_historic.html')
print('updated water table context figure')
#plot(fig)
    