/*$VS,'$CO JQ,JM=__JOBNAME__,USERID=__USERID__'
//AUTOIPLW JOB ,'KMINER 407-493-5229 ',CLASS=A,MSGCLASS=X,
//             MSGLEVEL=(2,0),NOTIFY=WCBUSER 
/*JOBPARM  S=*
//*
//*--------------------------------------------------------------------
//* Create symbols for the parms to passed to the AUTOIPL task
//*--------------------------------------------------------------------
//EXPORT1  EXPORT SYMLIST=(IPLVOL,FORCE,TGTSYS)
//SETIPL   SET IPLVOL=__VOLSERTYPE__
//SETFORCE SET FORCE=__FORCEBOOLEAN__
//SETTGT   SET TGTSYS=__SYSTEMNAME__
//*
//*--------------------------------------------------------------------
//* Start the AUTOIPLW using the AUTOIPL jobname
//*--------------------------------------------------------------------
//STARTIPL EXEC PGM=IKJEFT1B
//SYSPROC  DD DISP=SHR,DSN=D55TST.TEST.CLIST
//SYSTSPRT DD SYSOUT=*
//SYSPRINT DD SYSOUT=*
//SYSTSIN  DD *,SYMBOLS=EXECSYS
 %MVSCMD +
  S AUTOIPLW,FORCE=&FORCE,SYS=&TGTSYS,IPLVOL=&IPLVOL,JOBNAME=AUTOIPL +
  WAITTIME(2)
/*
//*
//*--------------------------------------------------------------------
//* Check to ensure the AUTOIPL task has finished (Within 600 seconds)
//*--------------------------------------------------------------------
//WAIT4IPL EXEC PGM=IKJEFT01
//SYSPROC  DD DISP=SHR,UNIT=3390,VOL=SER=D55SHR,DSN=D55TST.TEST.CLIST
//SYSTSPRT DD SYSOUT=*
//SYSPRINT DD SYSOUT=*
//SYSTSIN  DD *
 %WAIT4RSP CMD(D A,AUTOIPL) RESPONSE(AUTOIPL NOT) +
  INTERVAL(2) RETRY(300) WAITTIME(2)
/*
//*
//*--------------------------------------------------------------------
//* Copy the results of the AUTOIPL
//*-------------------------------------------------------------------
//COPYIPL  EXEC PGM=IKJEFT01
//SYSPROC  DD DISP=SHR,UNIT=3390,VOL=SER=D55SHR,DSN=D55TST.TEST.CLIST
//SYSTSPRT DD SYSOUT=*
//SYSPRINT DD SYSOUT=*
//SYSIN    DD DUMMY
//SYSUT2   DD SYSOUT=*
//SYSTSIN  DD *,SYMBOLS=EXECSYS
  ALLOC DD(SYSUT1) DA('D55TST.AUTOIPL.FROM.&SYSNAME') SHR REUSE
  %CALLPGM,IEBGENER
//*
//*
