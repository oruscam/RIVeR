# -*- mode: python ; coding: utf-8 -*-


block_cipher = None


a = Analysis(['main_desk.py'],
             pathex=['c:\\Users\\antoi\\Documents\\river_desktop'],
             binaries=[],
             datas=[],
             hiddenimports=[],
             hookspath=[],
             runtime_hooks=[],
             excludes=[],
             win_no_prefer_redirects=False,
             win_private_assemblies=False,
             cipher=block_cipher,
             noarchive=False)
pyz = PYZ(a.pure, a.zipped_data,
             cipher=block_cipher)
exe = EXE(pyz,
          a.scripts,
          a.binaries,
          a.zipfiles,
          a.datas,
          [],
          name='main_desk',
          debug=False,
          bootloader_ignore_signals=False,
          strip=False,
          upx=True,
          upx_exclude=[],
          runtime_tmpdir=None,
          console=True , icon='c:\\Users\\antoi\\Dropbox\\03_Trabajo\\07_Comunication_RIVeR\\RIVeR_2.5\\icone_river_python_desktop.ico')
