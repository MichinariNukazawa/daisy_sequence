daisy sequence
====
[![Build Status](https://travis-ci.org/MichinariNukazawa/daisy_sequence.svg?branch=master)](https://travis-ci.org/MichinariNukazawa/daisy_sequence)  

daisy sequence is (not) UML sequence diagram editor.  

# 概要
daisy sequenceは、フリーのシーケンス図エディタです。  
Win/Mac/Linux対応。  

![daisy sequence](document/image/daisy_sequence_201803.14.png)  

## 特徴
- マルチプラットフォーム(Windows/Mac/Linux)
- 印刷/HiDPIにも使えるSVG/PNG書き出し
- CLIからの書き出し処理によるCI連携が可能
- PlantUML書き出し
- バージョン管理しやすいJSONテキストベースのネイティブファイルフォーマット

# Download
[Download for latest release](https://github.com/MichinariNukazawa/daisy_sequence/releases)  

# License
MIT  
コントリビュートの際はライセンスに同意する必要があります  

# Feature
- Edit elements(Lifeline, Message, ExecutionSpecification (spec), Fragment, Operand)
- Export for SVG/PNG/PlantUML(.puml)
- CLI export (notice: non headless)

## TODO
- More usefull editor
- Auto save backup
- Auto positioning (ex. fix Messages between height, Fragment overwrap relocation)
- UML Strict Mode (need you?)
- design customize (CSS based)

