/*$VS,'$CO JQ,JM=__JOBNAME__,USERID=__USERID__'
//__INSTASYMOD__ JOB D55,CLASS=A,REGION=128M,
//         NOTIFY=WCBUSER,MSGCLASS=H,COND=(4,LT)
/*JOBPARM  S=*
//*
//EXPORT1  EXPORT SYMLIST=(*)
//SETRELSE SET RLSE=&SYSOSLVL(4:1)&SYSOSLVL(6:1)
//* Set the target IPL volume to the active or alternate IPL volume
//SETIPL   SET IPLVOL=&SYSR1.      Active IPL volume
//*ETIPL   SET IPLVOL=&SYSR2.      Change to alternate IPL volume
//*
//SETMAINT SET MAINT=__SYSMODNAME__       Set to the APAR/PTF to install
//SETDATE  SET DEVDATE=&LMON./&LDAY./&LYR4 Date developer provided fix
//SETTYPE  SET TYPE='++APAR'        APAR, PTF or UMOD
//SETDESC  SET DSC='__DESCRIPTION__'
//SETSOURC SET SOURCE=D55TST.ZOSR&RLSE..LKED.K&RLSE. APAR source d.s.
//*
//* Set REJECT symbol to remove maintenance from the SMPE global zone.
//* Reject an APAR/PTF if new version doesn't have higher REWORK date
//SETREJCT SET REJECT=NO          Set REJECT to YES or NO
//*
//*
//*--------------------------------------------------------------------
//* Test the REJECT symbol setting using SuperC
//*--------------------------------------------------------------------
//*
//*
//CHKREJCT EXEC PGM=ISRSUPC,
//            PARM=(SRCHCMP,'ANYC,FINDALL,NOPRTCC,LONGLN,XREF')
//NEWDD    DD *,SYMBOLS=EXECSYS
  &REJECT
//OUTDD    DD SYSOUT=*
//SYSIN    DD *
  SRCHFOR  'YES'
/*
//*
//IFREJECT IF (CHKREJCT.RC EQ 1) THEN
//*--------------------------------------------------------------------
//* Reject then receive
//*--------------------------------------------------------------------
//REJECT   EXEC SMPE
//SMPCSI   DD DISP=SHR,DSN=SMPE.&IPLVOL..CSI
//SMPLOG   DD SYSOUT=*
//SMPLOGA  DD DUMMY
//SMPCNTL  DD *,SYMBOLS=EXECSYS
   SET BDY(GLOBAL) .
   REJECT
   S(&MAINT
     )
   BYPASS(APPLYCHECK,ACCEPTCHECK).
   RESETRC.
/*
//*
//IFREJECT ENDIF
//*--------------------------------------------------------------------
//* SMPE Receive the maintenance
//*--------------------------------------------------------------------
//RECEIVE  EXEC SMPE
//SMPCSI   DD DISP=SHR,DSN=SMPE.&IPLVOL..CSI
//SMPLOG   DD SYSOUT=*
//SMPLOGA  DD DUMMY
//SMPPTFIN DD DISP=SHR,DSN=&SOURCE(&MAINT.)
//SMPCNTL  DD *,SYMBOLS=EXECSYS
  SET BDY(GLOBAL) .
  RECEIVE SYSMODS LIST.

  LIST SYSMOD(
              &MAINT.
       ).
/*
//*
//*--------------------------------------------------------------------
//* Apply check the maintenance if the receive was okay
//*--------------------------------------------------------------------
//IFRCVOK IF RECEIVE.SMPE.RC LT 5 THEN
//APPLYC   EXEC SMPE
//SMPCSI   DD DISP=SHR,DSN=SMPE.&IPLVOL..CSI
//SMPLOG   DD SYSOUT=*
//SMPLOGA  DD DUMMY
//AMODGEN  DD DISP=SHR,UNIT=3390,DSN=SYS1.MODGEN,VOL=SER=&IPLVOL.
//SYSLIB   DD DISP=SHR,DSN=SYS1.&IPLVOL..SMPMTS,
//            UNIT=3390,VOL=SER=&IPLVOL.
//         DD DISP=SHR,UNIT=3390,DSN=SYS1.MODGEN,VOL=SER=&IPLVOL.
//         DD DISP=SHR,UNIT=3390,DSN=SYS1.MACLIB,VOL=SER=&IPLVOL.
//SMPCNTL  DD *,SYMBOLS=EXECSYS
  SET BDY(&IPLVOL.T).
  APPLY SELECT(
              &MAINT
              )
  BYPASS(HOLDSYS) GROUP CHECK REDO.
/*
//*
//*--------------------------------------------------------------------
//*  Apply the maintenance if the apply check was okay
//*--------------------------------------------------------------------
//IFAPCOK IF APPLYC.SMPE.RC LT 5 THEN
//APPLY    EXEC SMPE,REGION=128M
//SMPLOG   DD SYSOUT=*
//SMPLOGA  DD DUMMY
//SMPCSI   DD DISP=SHR,DSN=SMPE.&IPLVOL..CSI
//AMODGEN  DD DISP=SHR,UNIT=3390,DSN=SYS1.MODGEN,VOL=SER=&IPLVOL.
//SYSLIB   DD DISP=SHR,DSN=SYS1.&IPLVOL..SMPMTS,
//            UNIT=3390,VOL=SER=&IPLVOL.
//         DD DISP=SHR,UNIT=3390,DSN=SYS1.MODGEN,VOL=SER=&IPLVOL.
//         DD DISP=SHR,UNIT=3390,DSN=SYS1.MACLIB,VOL=SER=&IPLVOL.
//         DD DISP=SHR,UNIT=3390,DSN=SYS1.SHASMAC,VOL=SER=&IPLVOL.
//SMPCNTL  DD *,SYMBOLS=EXECSYS
  SET BDY(&IPLVOL.T).
  APPLY SELECT(
               &MAINT
               )
  BYPASS(HOLDSYS) GROUP REDO.

  LIST SYSMOD(&MAINT.).
/*
//*
//*--------------------------------------------------------------------
//*  Update the source for the broadcast messages as needed.
//*--------------------------------------------------------------------
//UPDTDRVR EXEC PGM=IKJEFT1B,REGION=6M,COND=(8,LT,APPLY.SMPE)
//SYSPROC  DD DISP=SHR,DSN=D55TST.TEST.CLIST
//SYSTSPRT DD SYSOUT=*,DCB=(LRECL=133)
//LISTEND  DD *
Use the D PARMLIB and $D PROCLIB
/*
//BDCTSYS  DD DISP=SHR,DSN=SYS1.PARMLIB(BDCTSYS),
//            UNIT=3390,VOL=SER=&IPLVOL.
//*
//SYSTSIN  DD *,SYMBOLS=EXECSYS  Input can't extend beyond column 71
  %CHGBDCST +
&MAINT.S- &DEVDATE &TYPE &DSC
/*
//*
// ENDIF (APPLYC)
// ENDIF (RECEIVE)
//*
//
