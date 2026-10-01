#!/usr/bin/env python3
"""Test exported campaign data against the C engine using the host compiler."""
import argparse
from pathlib import Path
import subprocess

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('data',type=Path)
parser.add_argument('--sunstone',action='store_true')
parser.add_argument('--cc',default='gcc')
args=parser.parse_args()
engine=ROOT/'appData/engine/gbavm'
data=args.data.resolve()
binary=data/'campaign-runtime-test'
if __import__('os').name=='nt': binary=binary.with_suffix('.exe')
command=[args.cc,'-std=c11','-Wall','-Wextra',f'-I{data}/include',f'-I{engine}/tests',f'-I{engine}/include',f'-I{engine}/src','-DGBA_SYSTEM_H','-include',str(engine/'tests/gba_system.h')]
if args.sunstone: command.append('-DSUNSTONE')
command += [str(ROOT/'scripts/test-campaign-runtime.c'),str(engine/'tests/test_engine_stubs.c')]
command += [str(engine/'src'/f'{name}.c') for name in ['vm','camera','collision','text','savegame','movement','trigger']]
command += [str(data/'src/data/gba_scene_data.c'),'-o',str(binary)]
subprocess.run(command,check=True)
subprocess.run([str(binary)],check=True)
