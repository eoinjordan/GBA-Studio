#!/usr/bin/env python3
"""Export a Studio project, compile the Tang engine and optionally load USB."""
import argparse
from pathlib import Path
import shutil
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[1]

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('project',type=Path)
    parser.add_argument('destination',type=Path)
    parser.add_argument('--engine',type=Path,default=ROOT/'appData/engine/gbavm')
    parser.add_argument('--fpga',type=Path,default=ROOT.parent/'GBA-FPGA')
    parser.add_argument('--llvm',type=Path)
    parser.add_argument('--node',default=shutil.which('node'))
    parser.add_argument('--port',help='Load the resulting game over this UART; studio_lcd must already be programmed')
    args=parser.parse_args()
    cli=ROOT/'out/cli/gb-studio-cli.js'
    if not args.node or not cli.is_file(): parser.error('Run npm run make:cli first and put Node.js on PATH')
    destination=args.destination.resolve()
    data=destination/'data'; firmware=destination/'firmware'
    subprocess.run([args.node,str(cli),'export',str(args.project.resolve()),str(data),'--target','gba','--verbose'],cwd=ROOT,check=True)
    command=[sys.executable,str(args.engine.resolve()/'platform/tangnano20k/build.py'),
             '--data',str(data),'--out',str(firmware)]
    if args.llvm: command+=['--llvm',str(args.llvm.resolve())]
    subprocess.run(command,check=True)
    if args.port:
        subprocess.run([sys.executable,str(args.fpga.resolve()/'scripts/load-studio-lcd.py'),
                        '--port',args.port,'--firmware',str(firmware/'game.tang.bin'),
                        '--report',str(destination/'hardware.json')],check=True)
    print('Tang firmware: '+str(firmware/'game.tang.bin'))

if __name__=='__main__': main()
