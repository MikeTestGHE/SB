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
//MVSDINFO JOB ,CLASS=A,MSGLEVEL=(1,1),MSGCLASS=H
//MVSCMD   EXEC PGM=IKJEFT1B,REGION=6M
//SYSPROC  DD DISP=SHR,UNIT=3390,VOL=SER=D55SHR,DSN=D55TST.TEST.CLIST
//SYSTSPRT DD SYSOUT=*
//SYSPRINT DD SYSOUT=*
//SYSTSIN  DD *
  %MVSCMD D IPLINFO WAITTIME(2)
/*