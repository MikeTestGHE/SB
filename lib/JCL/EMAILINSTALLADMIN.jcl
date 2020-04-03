//*******************************************************************
//*                                                                    
//* Copyright (c) 2017 IBM Corp.                                     
//* All rights reserved. This program and the accompanying materials 
//* are made available under the terms of the Eclipse Public License 
//* v1.0 which accompanies this distribution, and is available at   
//* http://www.eclipse.org/legal/epl-v10.html                       
//*                                                                 
//* Contributors:                                                   
//*  IBM Corp. - initial API and implementation                     
//*                                                                 
//*******************************************************************
/*$VS,'$CO JQ,JM=__JOBNAME__,USERID=__USERID__'
//SMTPNOTE JOB ,'KMINER 720-396-7373 ',CLASS=A,MSGCLASS=X,
//             NOTIFY=WCBUSER
/*JOBPARM  S=*
//*
//E1       EXPORT SYMLIST=(*)
//SETREQBY SET REQBY=WCBUSER
//SETDTIME SET NDATE=&LYYMMDD,NTIME=&LHHMMSS
//SETRELSE SET RLSE=&SYSOSLVL(4:1)&SYSOSLVL(6:1)                     
//SETSOURC SET SOURCE=D55TST.ZOSR&RLSE..LKED.K&RLSE. APAR source d.s.
//*
//IDCAMS1  EXEC PGM=IDCAMS,REGION=2M
//SYSPRINT DD SYSOUT=*
//SYSIN    DD *,SYMBOLS=EXECSYS
  DEL WCBUSER.NOTE.&REQBY..D&NDATE..T&NTIME
  DEL WCBUSER.NOTE.&REQBY..D&NDATE..T&NTIME NSCR
  IF MAXCC LT 9 THEN SET MAXCC EQ 0
/*
//*
//CR8TTEXT EXEC PGM=IEBGENER
//SYSIN    DD DUMMY
//SYSPRINT DD SYSOUT=*
//SYSUT2   DD DSN=WCBUSER.NOTE.&REQBY..D&NDATE..T&NTIME,
//            DISP=(,CATLG,DELETE),UNIT=3390,SPACE=(TRK,(1,1)),
//            DCB=(RECFM=FB,LRECL=80,BLKSIZE=0)
//SYSUT1   DD *,SYMBOLS=EXECSYS
Hello!

Slack user has used WCB to install usermod __USERMOD__ in native system __MES__
__VOLINFO__ at __TIMESTAMP__.
The source data set for the maintenance is &SOURCE..

Here is the output that WCB returned to Slack user:

================================================================================
__CONTENT__
================================================================================

__BCUPDATE__

Please do not reply directly to this email as it is sent from
an unmonitored mailbox.

Thank you!  
/*
//*
//SENDNOTE EXEC PGM=IKJEFT1B,REGION=4M,DYNAMNBR=600
//SYSPROC  DD DISP=SHR,DSN=D55TST.TEST.CLIST
//SYSTSPRT DD SYSOUT=*
//SYSTSIN  DD *,SYMBOLS=EXECSYS
%SMTPNOTE SUBJECT(Installing activity of     +
  usermod __USERMOD__ on __MES__) NOCC BATCH +
  DATASET('WCBUSER.NOTE.&REQBY..D&NDATE..T&NTIME')                  +
  TO(keminer@us.ibm.com phamct@us.ibm.com __EMAILUSER__)
/*
//*
//DELNOTE  EXEC PGM=IDCAMS,REGION=2M
//SYSPRINT DD SYSOUT=*
//SYSIN    DD *,SYMBOLS=EXECSYS
  DEL 'WCBUSER.NOTE.&REQBY..D&NDATE..T&NTIME'
  IF MAXCC LT 9 THEN SET MAXCC EQ 0
/*
