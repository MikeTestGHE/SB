/*$VS,'$CO JQ,JM=__JOBNAME__,USERID=__USERID__'
//LISTAPAR JOB ,'UPDATE BROADCAST MSG',REGION=6M,                               
//         MSGCLASS=H,NOTIFY=WCBUSER                                           
/*JOBPARM S=*                                                                   
//*                                                                             
//*-------------------------------------------------------------------          
//* List sysmods                                                                
//*-------------------------------------------------------------------          
//SMPELIST EXEC PGM=GIMSMP,PARM='PROCESS=WAIT,DATE=U',                          
//         DYNAMNBR=120,COND=(0,LT)                                             
//SMPOUT   DD SYSOUT=*                                                          
//SMPRPT   DD SYSOUT=*                                                          
//SMPLIST  DD DISP=(,PASS),DSN=&SMPLIST,                                        
//            UNIT=3390,SPACE=(CYL,(5,5)),                                      
//            DCB=(RECFM=FB,LRECL=121,BLKSIZE=0)                                
//*                                                                             
//SMPLOG   DD DUMMY       SMPLOG not defined in the target                      
//*                                                                             
//* Test with A57035 or A57075                                                  
//SMPCSI   DD DISP=SHR,DSN=SMPE.&SYSR1..CSI                                     
//SMPCNTL  DD *,SYMBOLS=EXECSYS                                                 
  SET  BOUNDARY (&SYSR1.T).                                                     
      LIST SYSMOD(                                                              
                AA__SYSMODNUM__                                                         
                BA__SYSMODNUM__                                                         
                CA__SYSMODNUM__                                                         
                DA__SYSMODNUM__                                                        
                EA__SYSMODNUM__                                                        
                 ).                                                             
/*                                                                              
//*                                                                             
//*-------------------------------------------------------------------          
//* Copy the SMPE list of maintenance to sysout                                 
//*-------------------------------------------------------------------          
//GENRSMP  EXEC PGM=IEFBR14   IEBGENER Changed to do nothing                    
//SYSIN    DD DUMMY                                                             
//SYSPRINT DD DUMMY                                                             
//SYSUT1   DD DISP=(OLD,PASS),DSN=&SMPLIST                                      
//SYSUT2   DD SYSOUT=*                                                          
//*                                                                             
//*                                                                             
//*--------------------------------------------------------------------         
//* Parse the SMPE LIST SYSMOD output to create a summary                       
//*--------------------------------------------------------------------         
//SMPSUMM  EXEC PGM=IKJEFT1B,DYNAMNBR=200,PARM='%SMPECOM2'                      
//SYSPROC  DD DISP=SHR,UNIT=3390,VOL=SER=D55SHR,DSN=D55TST.TEST.CLIST           
//SYSTSPRT DD DISP=(,PASS),DSN=&SMPSUMM,                                        
//            UNIT=3390,SPACE=(CYL,(5,5)),                                      
//            DCB=(RECFM=FBA,LRECL=121,BLKSIZE=0)                               
//SYSTSIN  DD DUMMY                                                             
//LISTACTV DD DISP=(OLD,PASS),DSN=&SMPLIST                                      
//LISTNEXT DD DUMMY                                                             
//*                                                                             
//*                                                                             
//*--------------------------------------------------------------------         
//* Read the SMPE LIST SYSMOD summary to determine sysmods installed            
//*--------------------------------------------------------------------         
//READSUMM EXEC PGM=IKJEFT1B,DYNAMNBR=200,PARM='%BUILDSMP'                      
//SYSPROC  DD DISP=SHR,UNIT=3390,VOL=SER=D55SHR,DSN=D55TST.TEST.CLIST           
//SMPESUMM DD DISP=(OLD,PASS),DSN=&SMPSUMM                                      
//LISTSMPE DD DISP=(,PASS),DSN=&LISTSMPE,                                       
//            UNIT=3390,SPACE=(CYL,(5,5)),                                      
//            DCB=(RECFM=FB,LRECL=80,BLKSIZE=0)                                 
//SYSTSPRT DD SYSOUT=*                                                          
//SYSTSIN  DD DUMMY                                                             
//*                                                                             
//*-------------------------------------------------------------------          
//* List the one APAR found in the summary                                      
//*-------------------------------------------------------------------          
//IF1APAR  IF (READSUMM.RC EQ 1) THEN                                           
//LISTAPAR EXEC PGM=GIMSMP,PARM='PROCESS=WAIT,DATE=U'                           
//SMPOUT   DD SYSOUT=*                                                          
//SMPRPT   DD SYSOUT=*                                                          
//SMPLIST  DD SYSOUT=*                                                          
//SMPLOG   DD DUMMY       SMPLOG not defined in the target                      
//*                                                                             
//SMPCSI   DD DISP=SHR,DSN=SMPE.&SYSR1..CSI                                     
//SMPCNTL  DD *,SYMBOLS=EXECSYS                                                 
  SET  BOUNDARY (&SYSR1.T).                                                     
//         DD DISP=(OLD,PASS),DSN=&LISTSMPE                                     
//*                                                                             
//IF1APAR  ENDIF                                                                
//*                                                                             
//*-------------------------------------------------------------------          
//* List addition APARs on the active IPL volume                                
//*-------------------------------------------------------------------          
//IFNOTONE IF (READSUMM.RC EQ 0) THEN                                           
//GENRSUMM EXEC PGM=IEBGENER                                                    
//SYSIN    DD DUMMY                                                             
//SYSPRINT DD DUMMY                                                             
//SYSUT1   DD DISP=(OLD,PASS),DSN=&SMPSUMM                                      
//SYSUT2   DD SYSOUT=*                                                          
//*                                                                             
//IFNOTONE ENDIF                                                                
//*                                                                             
