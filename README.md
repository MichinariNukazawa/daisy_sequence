daisy sequence UML Sequence Diagram Editor
====

# 概要
daisy sequenceは、Win/Mac/Linux用のシーケンス図エディタです。

# コアコンセプト
要素技術としては、 electron/javascript/SVG

Win/Mac/Linux対応
electron上のSPAとしてjavascriptで構築することで実現する。


# ファーストリリース機能
- オブジェクトの配置・描画・移動・削除
 オブジェクト:
  ライフライン・実行仕様・各種メッセージ・ファウンド・ロスト・停止・Memo・複合フラグメント
- プロジェクト読み込み・保存
- SVG書き出し
- Undo/Redo

ライフラインの縦横位置調整
メッセージ終端のライフラインへのスナップ

# ファーストリリース見送り機能
UML Strict Mode(UML準拠)
自動位置調整(Lineline表示の重なりなどを自動で解決する)
複合フラグメントの種別ごとの形状(Memoを重ねれば足りるはず)
重ね順の並び替え


# データ構造

DocCollection{
	Doc docs[]{
		int diagram_history_index;
		Diagram diagram_history[];
	};

	DocId create_doc();
	Doc get_doc_from_id();
};

## ドキュメント構造
{
	index,				//current diagram
	diagrams:[
		[Element, Element, ...],
		[Element, Element, ...], // ex. <- current diagram index is 1
		[Element, Element, ...],
	],
}

### Lifeline
{
	kind, id,
	x,
	y,
	// width is text.BBox().width
	// height is text.BBox().height
	text,		// lifeline name
}

### Message
{
	// x is start
	y,
	// width is start between end
	// height is zero.
	start,		// Lifeline or positon{x} for found
	end,		// Lifeline or positon{x} for lost
	end_kind,	// [none, create, stop]
	message_kind,		// [sync, async, reply]
	text,		// message text
	spec,		// spec object(optional)
}

### ExecutionSpecification (spec)
{
	// x is parent_message.x
	// y is parent_message.y - this.y_offset,
	// width is zero.
	// parent_message,
	y_offset,	// this y position from parent_message.y offset
	end,		// height or 'reply'
}

### Flugment
{
	x,
	y,
	// width is text.BBox().width or kind string (max)
	// height is text.BBox().height + kind string
	kind,		// string [memo, ref, ...]
	text,		// for memo text
}



