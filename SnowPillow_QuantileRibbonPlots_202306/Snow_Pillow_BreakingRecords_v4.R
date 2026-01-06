# install.packages('tidyverse')
# install.packages('clock')

library(tidyverse)
library(clock)


setwd('S:\\HAFOO\\HYDRO\\SNOW\\data\\Python_scripts\\BreakingSnowRecords_Plots_2023')

df_key <- read.csv('Snow_Pillow_BreakingRecords_Key_v3.csv')

CDEC_Pull <- function(var_stns,var_period,var_sensorid,var_startdate,var_enddate){
  df <- data.frame()
  URL1 <- "https://cdec.water.ca.gov/dynamicapp/req/CSVDataServlet?Stations="
  URL2 <- var_stns
  URL3 <- "&SensorNums="
  URL4 <- var_sensorid
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



# df_key_2 = na.omit(df_key[c('PREVIOUS_RECORD','CURRENT_YEAR_MAX')])
# 
# df_key_3 = pivot_longer(df_key_2,c('PREVIOUS_RECORD','CURRENT_YEAR_MAX'))
# 
# colnames(df_key_3) <- c('METHOD','VALUE')
# 
# str(df_key_3)
# 
# df_key_3$METHOD <- as.factor(df_key_3$METHOD)
# 
# p <- ggplot(df_key_3, aes('METHOD','VALUE'))+
#   geom_boxplot()
# 
# p

# df_key <- read.csv('SNOW_PILLOW_PLOTS\\pillow_records_table_20230410.csv')

# df_key_2 <- na.omit(df_key[c('PREVIOUS_RECORD','CURRENT_YEAR_MAX')])
# 
# df_key_3 <- pivot_longer(df_key_2,c('PREVIOUS_RECORD','CURRENT_YEAR_MAX'))
# 
# colnames(df_key_3) <- c('FILTER_METHOD','SWE_INCH')
# 
# p <- ggplot(df_key_3,aes(x=FILTER_METHOD,y=SWE_INCH,fill=FILTER_METHOD))+
#   geom_boxplot(outlier.shape=NA) +
#   geom_jitter(width=0.2) +
#   labs(title=paste0('Distribution of Maximums'),
#        subtitle = paste0('For all snow sensors considered'),
#        caption='Box plot without outliers and point jitter added',
#        x='Filter Method',
#        y='SWE (in)')+
#   theme(legend.position="none")
# 
# 
# ggsave(filename=paste0('SNOW_PILLOW_PLOTS\\','PILLOW_MAX_SUMMARY_',current_date,'.png'),plot=p,width=6,height=6,units='in',dpi=400)