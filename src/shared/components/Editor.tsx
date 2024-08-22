"use client";

import React, { ChangeEventHandler, Component, CSSProperties, MutableRefObject, useCallback, useEffect, useRef, useState } from "react";

import "@/styles/Editor.css"

import pen from "@/../public/assets/pen.png";
import Image from "next/image";
import edit from "@/../public/assets/edit.png"
import { useDropzone } from "react-dropzone";
import { HandwritingRecognize, HandwritingRecognizeOptions } from "@/utils/handwriting";
import StyledText from "@/shared/components/StyledText";
import { getFontHeight, getFontWidth } from "@/utils/TextUtil";

enum BlockType {
    Text, Separator, H1, H2, H3, H4, Image
}

class BlockData {
    type: BlockType;

    text: string; /** For writable */
    source: string; /** For media */
    children: BlockData[]; /** For innerable */
    constructor(type: BlockType) {
        this.type = type;

        this.text = "";
        this.source = "";
        this.children = [];
    }
}
class FocusRange {
    startLine: number
    startCol: number
    endLine: number
    endCol: number
    constructor(startLine: number, startCol: number, endLine: number, endCol: number) {
        this.startLine = startLine;
        this.startCol = startCol;
        this.endLine = endLine;
        this.endCol = endCol;
    }

    static zero(): FocusRange { return new FocusRange(0, 0, 0, 0); }
    static col(line: number, col: number): FocusRange { return new FocusRange(line, col, line, col); }

    static fromSource(source: string, startCol: number, endCol: number): FocusRange {
        var temp_st = Math.min(startCol, endCol);
        endCol = Math.max(startCol, endCol);
        startCol = temp_st;
        
        const lines = source.split('\n');
        let lastLineEndCol = 0;
        let startLine = 0;
        let endLine = 0;

        for (let i = 0; i < lines.length; i++) {
            const lineLength = lines[i].length + 1; // +1 for the newline character
            if (lastLineEndCol + lineLength > startCol && startLine === 0) {
                startLine = i;
            }
            if (lastLineEndCol + lineLength > endCol) {
                endLine = i;
                break;
            }
            lastLineEndCol += lineLength;
        }

        const startColInLine = startCol - lastLineEndCol;
        const endColInLine = endCol - lastLineEndCol;

        return new FocusRange(startLine, startColInLine, endLine, endColInLine);
    }

    toRawCol(source: string): {start: number, end: number} {
            const lines = source.split('\n');

            function index (line: number, col: number){
                var raw = 0;
                if (line == -1) line = lines.length-1;
                if (col == -1) col = lines[line].length;
                line = Math.min(lines.length-1, line)
                col = Math.min(lines[line].length, col);


                for (let i=0; i<line; i++) raw += lines[i].length + 1;
                raw += col
                return raw
            }
    
            return { start: index(this.startLine, this.startCol), end: index(this.endLine, this.endCol) };
    }

    copy = () => new FocusRange(this.startLine, this.startCol, this.endLine, this.endCol)
}
type FocusData = {
    index: number, 
    selection: FocusRange
}

type DrawingSegment = {
    x: number
    y: number
}

type DrawingPeice = {
    segments: DrawingSegment[]
    color: string
}

class DrawingData {
    items: DrawingPeice[];
    color1: string;
    color2: string;
    color3: string;

    constructor() {
        this.items = [];
        this.color1 = "#000000";
        this.color2 = "#ff0000";
        this.color3 = "#0000ff";
    }
    
}
class Document {
    id: string;
    title: string;
    blocks: BlockData[];
    focus: FocusData;
    draw: DrawingData;

    spell: boolean;
    grid: boolean;
    constructor(id: string, title: string) {
        this.id = id;
        this.title = title;
        this.blocks = [new BlockData(BlockType.Text)];
        this.focus = {index:0, selection:FocusRange.zero()};
        this.draw = new DrawingData();

        this.spell = true;
        this.grid = true;
    }
    insertBlock = (block: BlockData, index: number) => {
        this.blocks = [...this.blocks.slice(0, index), block, ...this.blocks.slice(index, this.blocks.length)];
    }
}

interface BlockProps extends React.HTMLProps<HTMLDivElement> {
    docid: string;
    index: number;
    blockData: BlockData;
    focusData: FocusData;

    fnAddBlock: (index: number) => void;
    fnSetFocus: React.Dispatch<React.SetStateAction<FocusData>>

    setMediaSelectorMode: React.Dispatch<React.SetStateAction<"none" | "image" | "video">>
    mediaSelectorCallback: React.MutableRefObject<((url: string) => void) | null>
}

const Block: React.FC<BlockProps> = ({
    docid, index, blockData, focusData,
    fnAddBlock, fnSetFocus,
    setMediaSelectorMode, mediaSelectorCallback,
    ...props
}) => {
    
    const _EnableMultiline: boolean = blockData.type == BlockType.Text

    

    






    var [text, setText] = useState("");
    var [source, setSource] = useState<string | null>(null);
    useEffect(() => {
        setText(blockData.text)
        setTimeout(fixHeight, 5)

        blockData.source && setSource(blockData.source)
    }, [index, blockData])







    function fixHeight() {
        // textarea.style.height = 'auto';
        // let height = textarea.scrollHeight; // 높이
        // textarea.style.height = `${height}px`;
        var textarea = window.document.getElementById(`input-${docid}-${index}`) as HTMLTextAreaElement | null;
        var block = window.document.getElementById(`block-${docid}-${index}`) as HTMLDivElement | null;
        if (textarea && block) {
            var height: string = '24px';
            if (blockData.type == BlockType.Text) {
                height = `${textarea.value.split("\n").length*24}px`;
            } else {
                height = ''
            }
            textarea.style.height = height;
            block.style.height = `${textarea.clientHeight}px`;
        } else if (block) {
            block.style.height = "";
        }
    }
    function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
        if (event.key == "Enter") {
            if (event.shiftKey) {
                if (!_EnableMultiline) event.preventDefault();
                setTimeout(fixHeight, 100)
                return;
            } else { fnAddBlock(index+1); event.preventDefault(); return; }
        }
        var textarea = window.document.getElementById(`input-${docid}-${index}`) as HTMLTextAreaElement | null;
        var source = textarea?.value;
        var selectionStart = textarea?.selectionStart ?? -1;
        var selectionEnd = textarea?.selectionEnd ?? -1;
        var firstLineEnd = source?.indexOf("\n") ?? -1;
        var lastLineStart = source?.lastIndexOf("\n") ?? -1;
        if ((firstLineEnd  == -1 || selectionStart <= firstLineEnd) && event.key == "ArrowUp"  ) { 
            fnSetFocus({index:index-1, selection:FocusRange.col(-1,focusData.selection.startCol)}); 
            event.preventDefault(); return; 
        };
        if ((lastLineStart == -1 || selectionEnd   > lastLineStart) && event.key == "ArrowDown") {
            fnSetFocus({index:index+1, selection:FocusRange.col(0, focusData.selection.endCol)});
            event.preventDefault(); return;
        };
        if (source) {
            if (selectionStart == 0 && event.key == "ArrowLeft") {
                if (selectionStart == selectionEnd)
                    fnSetFocus({index:index-1, selection:FocusRange.col(-1, -1)}); //TODO
                else
                    fnSetFocus({index:index, selection:FocusRange.fromSource(source, selectionStart, selectionStart)});
                event.preventDefault(); return;
            };
            if (selectionEnd == (textarea?.value.length ?? -1) && event.key == "ArrowRight") {
                fnSetFocus({index:index+1, selection:FocusRange.zero()});
                event.preventDefault(); return; 
            };
        }
        
        if (source && selectionStart != -1 && selectionEnd != -1 && event.key.startsWith("Arrow")) {
            var current = FocusRange.fromSource(source, selectionStart, selectionEnd);
            if (event.key == "ArrowLeft") {
                var move = FocusRange.fromSource(source, Math.max(selectionStart-1, 0), Math.max(selectionStart-1, 0));
                if (event.shiftKey) {
                    current.startCol = move.startCol;
                    current.startLine = move.startLine;
                }
                else current = move;
            }
            if (event.key == "ArrowRight") {
                var move = FocusRange.fromSource(source, Math.min(selectionEnd+1, source.length), Math.min(selectionEnd+1, source.length));
                if (event.shiftKey) {
                    var move = FocusRange.fromSource(source, selectionStart+1, selectionStart+1);
                    current.startCol = move.startCol;
                    current.startLine = move.startLine;
                }
                else current = move;
            }
            if (event.key == "ArrowUp") {
                current.startLine = Math.max(current.startLine - 1, 0);
                current.endLine = current.startLine;
                current.endCol = current.startCol;
            }
            if (event.key == "ArrowDown") {
                current.startLine = Math.min(current.startLine + 1, source.split("\n").length);
                current.endLine = current.startLine;
                current.startCol = current.endCol;
            }
            fnSetFocus({index:index, selection:current.copy()});
            event.preventDefault();
        }
    }
    function onMouseUp(event: React.MouseEvent<HTMLTextAreaElement>) {
        var textarea = event.target as HTMLTextAreaElement | null;
        var source = textarea?.value;
        var selectionStart = textarea?.selectionStart ?? -1;
        var selectionEnd = textarea?.selectionEnd ?? -1;
        if (source) 
            fnSetFocus({index:index, selection:FocusRange.fromSource(source, selectionStart, selectionEnd)});
    }
    function executeText(text: string) {
        blockData.text = text
        setText(blockData.text)
        if (text == "/sep" || text == "---") {
            blockData.type = BlockType.Separator
            blockData.text = "";
            setText("");
            fnSetFocus({index:index+1, selection:FocusRange.zero()});
        } else if (text == "/h1" || text == "# ") {
            blockData.type = BlockType.H1
            blockData.text = "";
            setText("");
            fnSetFocus({index:index, selection:FocusRange.zero()});
            fixHeight();
        } else if (text == "/h2" || text == "## ") {
            blockData.type = BlockType.H2
            blockData.text = "";
            setText("");
            fnSetFocus({index:index, selection:FocusRange.zero()});
            fixHeight();
        } else if (text == "/h3" || text == "### ") {
            blockData.type = BlockType.H3
            blockData.text = "";
            setText("");
            fnSetFocus({index:index, selection:FocusRange.zero()});
            fixHeight();
        } else if (text == "/h4" || text == "#### ") {
            blockData.type = BlockType.H4
            blockData.text = "";
            setText("");
            fnSetFocus({index:index, selection:FocusRange.zero()});
            fixHeight();
        } else if (text == "/image") {
            blockData.type = BlockType.Image
            blockData.text = "";
            setText("");
            setTimeout(fixHeight, 100);
            setMediaSelectorMode("image");
            mediaSelectorCallback.current = url => {
                setSource(url);
                fnSetFocus({index:index+1, selection:FocusRange.zero()});
            }
        }
    }
    var onChange: ChangeEventHandler<HTMLTextAreaElement> = useCallback(event => executeText(event.target.value), [index, blockData]);
    return <div id={`block-${docid}-${index}`} {...props} className="relative" onKeyDown={onKeyDown}>
        {
        blockData.type == BlockType.Separator? <hr className="mt-[4px] mb-[3px] border-y-2" />
        :blockData.type == BlockType.Image?<img src={source ?? "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTbNX2nABlu-_8PGz9k2j6uexK1mucQgtGhhg&s"} className="select-none drag resize" draggable={false} />
        :
        <>
        <textarea 
                onMouseUp={onMouseUp}

                id={`input-${docid}-${index}`}

                className={
                    "bg-transparent text-transparent caret-black"
                    + " placeholder:text-transparent focus:placeholder:text-gray-400"
                    + " overflow-hidden resize-none outline-none"
                    + " absolute top-0 left-0"
                    + (blockData.type == BlockType.Text? " block h-[30px]" : "")
                    + (blockData.type == BlockType.H1?   " block h-[1.34em] text-[2em] mr-0 ml-0 font-bold" : "") // mt-[0.67em] mb-[0.67em]
                    + (blockData.type == BlockType.H2?   " block h-[1.66em] text-[1.5em] mr-0 ml-0 font-bold" : "") // mt-[0.83em] mb-[0.83em]
                    + (blockData.type == BlockType.H3?   " block h-[2em] text-[1.17em] mr-0 ml-0 font-bold" : "") // mt-[0.83em] mb-[0.83em]
                    + (blockData.type == BlockType.H4?   " block mr-0 ml-0 font-bold" : "") // mt-[0.83em] mb-[0.83em]
                    
                }
                style={{width:"100%", border:0}}//, color:"transparent"}}

                value={text} onChange={onChange} placeholder={"Write down something surprising!"}
                onInput={fixHeight} />
                <StyledText item={[{text:text, colorfg:"red"}]}/>
        </>
        }
    </div>
}

type DrawingPiece = {
    segments: { x: number, y: number }[],
    color: string
}

type CanvasProps = {
    id: string,
    className: string,
    drawingMode: boolean,
    drawingColor: string,
    drawingItems: MutableRefObject<DrawingPiece[]>,
    onDrawStart?: () => void,
    onDrawEnd?: () => void

    children?: React.ReactNode // Add this line to include children
}

type CanvasState = {
    ctx: CanvasRenderingContext2D | null
}

class Canvas extends Component<CanvasProps, CanvasState> {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    canvasWidth: number;
    canvasHeight: number;
    onDrawing: boolean;

    constructor(props: CanvasProps) {
        super(props);
        this.canvasRef = React.createRef<HTMLCanvasElement>();
        this.canvasWidth = 0;
        this.canvasHeight = 0;
        this.onDrawing = false;

        this.state = {
            ctx: null
        };
    }

    refresh = () => {
        const canvas = this.canvasRef.current;
        const width = canvas?.clientWidth ?? this.canvasWidth;
        const height = canvas?.clientHeight ?? this.canvasHeight;
        this.canvasWidth = width;
        this.canvasHeight = height;
        if(canvas) {
            canvas.width = width;
            canvas.height = height;
        }

        const { ctx } = this.state;
        const { drawingItems, drawingColor } = this.props;

        ctx?.clearRect(0, 0, width, height);
        drawingItems.current.forEach(
            piece => {
                ctx?.beginPath();
                if (ctx) ctx.strokeStyle = piece.color;
                piece.segments.forEach(
                    segment => ctx?.lineTo(segment.x * width, segment.y * width)
                );
                ctx?.stroke();
                ctx?.closePath();
            }
        );
        if (ctx) ctx.strokeStyle = drawingColor;
    }

    onDrawStart = () => {
        this.onDrawing = true;
        const { ctx } = this.state;
        const { drawingItems, drawingColor } = this.props;

        ctx?.beginPath();
        drawingItems.current.push({ segments: [], color: drawingColor });
        if (ctx) ctx.strokeStyle = drawingColor;
        this.props.onDrawStart && this.props.onDrawStart();
    }

    onDrawEnd = () => {
        this.onDrawing = false;
        this.state.ctx?.closePath();
        this.props.onDrawEnd && this.props.onDrawEnd();

        this.refresh();
    }

    handleMouseDown = () => {
        this.onDrawStart();
    }

    handleMouseUpOrLeave = () => {
        this.onDrawEnd();
    }

    handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (this.onDrawing) {
            const canvas = this.canvasRef.current;
            if (!canvas) return;

            const offsetX = e.nativeEvent.offsetX;
            const offsetY = e.nativeEvent.offsetY;

            const clientWidth = canvas.clientWidth;

            this.props.drawingItems.current[this.props.drawingItems.current.length - 1].segments.push({ x: offsetX / clientWidth, y: offsetY / clientWidth });

            this.state.ctx?.lineTo(offsetX, offsetY);
            this.state.ctx?.stroke();

            e.preventDefault();
        }
    }

    handleTouchStart = () => {
        this.onDrawStart();
    }

    handleTouchEnd = () => {
        this.onDrawEnd();
    }

    handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
        if (this.onDrawing) {
            const canvas = this.canvasRef.current;
            if (!canvas) return;

            const touch = e.nativeEvent.touches[0];
            const rect = canvas.getBoundingClientRect();
            const offsetX = touch.clientX - rect.left;
            const offsetY = touch.clientY - rect.top;

            const clientWidth = canvas.clientWidth;

            this.props.drawingItems.current[this.props.drawingItems.current.length - 1].segments.push({ x: offsetX / clientWidth, y: offsetY / clientWidth });

            this.state.ctx?.lineTo(offsetX, offsetY);
            this.state.ctx?.stroke();
        }
    }

    handleNativeTouchMove = (e: TouchEvent) => {
        // Prevent the default behavior
        e.preventDefault();

        // Create a React-like synthetic event
        const syntheticEvent = {
            ...e,
            nativeEvent: e,
            currentTarget: e.currentTarget as EventTarget & HTMLCanvasElement,
            target: e.target as EventTarget & HTMLCanvasElement,
            // You can add any other properties you need here
        } as unknown as React.TouchEvent<HTMLCanvasElement>;

        // Call the actual handler
        this.handleTouchMove(syntheticEvent);
    }


    componentDidMount() {
        const canvas = this.canvasRef.current;
        const context = canvas?.getContext("2d");
        if (context) context.imageSmoothingQuality = "high";
        this.setState({ ctx: context ?? null }, this.refresh);
        
        window.addEventListener('resize', this.refresh)
        this.canvasRef.current?.addEventListener('touchmove', this.handleNativeTouchMove, { passive: false });
    }

    componentDidUpdate(prevProps: CanvasProps) {
        if (prevProps.drawingColor !== this.props.drawingColor ||
            prevProps.drawingItems !== this.props.drawingItems) {
            this.refresh();
        }
        if (prevProps.drawingMode !== this.props.drawingMode) {
            this.onDrawing = false;
        }
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.refresh)
        this.canvasRef.current?.removeEventListener('touchmove', this.handleNativeTouchMove);
    }
    
    render() {
        const { id, drawingMode } = this.props;
        return (
            <canvas
                id={id}
                className={this.props.className + (drawingMode ? "" : " pointer-events-none")}
                width={this.canvasRef.current?.clientWidth}
                height={this.canvasRef.current?.clientHeight}
                ref={this.canvasRef}
                onMouseDown={this.handleMouseDown}
                onMouseUp={this.handleMouseUpOrLeave}
                onMouseLeave={() => this.onDrawing && this.handleMouseUpOrLeave()}
                onMouseMove={this.handleMouseMove}
                onTouchStart={this.handleTouchStart}
                onTouchEnd={this.handleTouchEnd}
                onTouchMove={this.handleTouchMove}
            >{this.props.children}</canvas>
        );
    }
}

export default function Editor({className, style}: {className?: string | undefined, style?: CSSProperties | undefined}) {
    var documentData = new Document("testdoc", "haru");

    // Modal Area
    var [mediaSelectorMode, setMediaSelectorMode] = useState<"none" | "image" | "video">("none");
    var mediaSelectorCallback = useRef<((url: string) => void) | null>(null);
    var [mediaSelectorUrl, setMediaSelectorUrl] = useState<string>("");
    
    const onDrop = useCallback((acceptedFiles: File[] ) => {
        // Do something with the files
            console.log(acceptedFiles)
    }, [])
    const mediaSelectorDropzone = useDropzone({ maxFiles: 1, onDrop: onDrop, noKeyboard: true })

    // Sidebar Area
    var [sidebarNumber, setSidebarNumber] = useState(0);

    
    var handwriteTimeout = useRef<NodeJS.Timeout | null>(null);
    var [handwriteMode, setHandwriteMode] = useState(false);
    var handwriteItems = useRef<DrawingPeice[]>([]);
    var [handwriteResult, setHandwriteResults] = useState<string[]>([]);

    var [drawingMode, setDrawingMode] = useState(0);

    var [drawingColor1, setDrawingColor1] = useState(documentData.draw.color1);
    var [drawingColor2, setDrawingColor2] = useState(documentData.draw.color2);
    var [drawingColor3, setDrawingColor3] = useState(documentData.draw.color3);
    useEffect(() => { documentData.draw.color1=drawingColor1 }, [drawingColor1]);
    useEffect(() => { documentData.draw.color2=drawingColor2 }, [drawingColor2]);
    useEffect(() => { documentData.draw.color3=drawingColor3 }, [drawingColor3]);
    var drawingItems = useRef(documentData.draw.items);
    // Sidebar Area

    
    // Editor Area
    var [docmuentBlocks, setDocumentBlocks] = useState(documentData.blocks);
    useEffect(() => { documentData.blocks = docmuentBlocks }, [docmuentBlocks]);
    var [docmuentFocus, setDocumentFocus] = useState(documentData.focus);
    useEffect(() => { documentData.focus = docmuentFocus }, [docmuentFocus]);
    var [docmuentSpell, setDocumentSpell] = useState(documentData.spell);
    useEffect(() => { documentData.spell = docmuentSpell }, [docmuentSpell]);
    var [docmuentGrid, setDocumentGrid] = useState(documentData.grid);
    useEffect(() => { documentData.grid = docmuentGrid }, [docmuentGrid]);



    var [targettingBlock, setTargettingBlock] = useState(-1);
    var [draggingBlock, setDraggingBlock] = useState(-1);
    var [draggingStick, setDraggingStick] = useState(-1);
    var [isDraggingBlock, setIsDraggingBlock] = useState(false);

    var [toolbarMode, setToolbarMode] = useState(false);


    function fnAddBlock(index: number) {
        var data: BlockData = new BlockData(BlockType.Text);
        setDocumentBlocks([...docmuentBlocks.slice(0, index), data, ...docmuentBlocks.slice(index, docmuentBlocks.length)])
        setDocumentFocus({index: index, selection:docmuentFocus.selection});
    }

    function focus() {
        var element = document.getElementById(`input-${documentData.id}-${docmuentFocus.index}`) as HTMLTextAreaElement;
        if (element) {
            var selection = docmuentFocus.selection.toRawCol(element.value);
            element.setSelectionRange(selection.start, selection.end);
            element.focus();

            setToolbarMode(selection.start != selection.end);

            var toolbar = document.getElementById("toolbar-"+documentData.id) as HTMLDivElement;
            if (toolbar) {
                var targetLine = element.value.split("\n")[docmuentFocus.selection.startLine];
                if (!targetLine) return;
                var offsetX = element.getBoundingClientRect().left + getFontWidth(element, targetLine.slice(0, docmuentFocus.selection.startLine == docmuentFocus.selection.endLine? docmuentFocus.selection.endCol : targetLine.length-1))

                // This is code for absolute (current fixed)
                // var offsetY = element.value.split("\n").slice(0, docmuentFocus.selection.startLine).map(line => getFontHeight(element, line)).reduce((a, b) => a + b, 0);
                // offsetY += [...Array(docmuentFocus.index)].map((value, index) => document.getElementById(`input-${documentData.id}-${index}`)?.clientHeight ?? 0).reduce((a, b) => a + b, 0);
                // offsetY -= toolbar.clientHeight;

                var offsetY = element.getBoundingClientRect().top - toolbar.clientHeight;
                console.log(toolbar.scrollHeight);
                toolbar.style.left = offsetX + "px";
                toolbar.style.top = offsetY + "px";
            }
        }
        else setTimeout(focus, 5);
    }
    useEffect(focus, [docmuentFocus]);

    return <div className={"flex flex-col overflow-hidden " + className} style={style}>
        <dialog style={{
            width: "600px",
            height: "400px",
            position: "absolute",
            left: "50%",
            top: "50%",
            marginLeft: "-300px",
            marginTop: "-200px",
            zIndex: 1000
        }} open={mediaSelectorMode != "none"} onClose={() => setMediaSelectorMode("none")}>
            <div className={"flex flex-row h-full w-[full] items-center"}>
                <div className="w-[50%] 
                                flex justify-center
                                cursor-pointer
                                py-6 m-5
                                transition-all
                                " //  border-4 border-sky-500 border-dashed rounded-3xl
                     style={mediaSelectorDropzone.isDragActive? {scale:"120%"} : {}}
                     {...mediaSelectorDropzone.getRootProps()}
                >
                    <p className="select-none text-center">
                        <span className="text-2xl block">Drop {mediaSelectorMode}</span>
                        <button className="text-gray-500 block">Or click here to choose</button>
                    </p>
                    <input id={`input-mediaselector-${documentData.id}`} className="hidden" type="file" {...mediaSelectorDropzone.getInputProps()}/>
                </div>
                <div className="flex flex-col h-full justify-center">
                <div className="grow flex flex-col items-center"><hr className="grow w-[4px] border-x-2 border-dashed"/></div>
                    <span className="text-slate-400">OR</span>
                    <div className="grow flex flex-col items-center"><hr className="grow w-[4px] border-x-2 border-dashed"/></div>
                </div>
                
                <div className="grow overflow-hidden">
                    <input className="w-full border-2" value={mediaSelectorUrl} onChange={e => setMediaSelectorUrl(e.target.value)} placeholder={"Input url for" + mediaSelectorMode}/>
                    <img className="w-[200px] h-[200px] object-cover" src={mediaSelectorUrl} alt="Image Preview"></img>
                </div>

                <button className="h-full bg-sky-100 py-2" onClick={() => {
                    mediaSelectorCallback.current && mediaSelectorCallback.current(mediaSelectorUrl);
                    mediaSelectorCallback.current = () => {};
                    setMediaSelectorMode("none");
                }}>Done!</button>
            </div>
        </dialog>

        
        <div className="w-full h-[40px] bg-[#E5E5E5] flex flex-row">
            <div className="w-[40px] h-[40px] bg-[#E5E5E5] border-y-2 border-x-2 border-[#A0A0A0] hover:bg-[#E5E5E5]"/>
            <div className="w-[200px] h-[40px] bg-[#E5E5E5] border-y-2 border-r-2 border-[#A0A0A0] text-lg font-bold flex flex-col justify-center items-center ">{documentData.title}</div>
        </div>
        
        <div className="w-full grow flex flex-row">
            <div className="w-[40px] h-full bg-[#E5E5E5] border-b-2 border-r-2 border-[#A0A0A0]">
                <Image src={edit} alt="" onClick={() => setSidebarNumber(sidebarNumber==1?0:1)}/>
                <Image src={edit} alt="" onClick={() => setSidebarNumber(sidebarNumber==2?0:2)}/>
            </div>
            <div className="w-[200px] h-full bg-[#E5E5E5] border-b-2 border-r-2 border-[#A0A0A0]" style={{display:(sidebarNumber!=0?"block":"none")}}>
                <div className={"w-full h-full" + (sidebarNumber==1?"":" hidden")}>
                    <div className="flex flex-row">
                        <button id={`button-handwrite-${documentData.id}`}
                                className="disabled:text-gray-500" disabled={handwriteMode} 
                                onClick={() => {
                                    var firstItem = handwriteResult.at(0);
                                    if (firstItem) {
                                        window.navigator.clipboard.writeText(firstItem);
                                        setHandwriteResults([]);
                                    } else {
                                        setHandwriteMode(true);
                                        setDrawingMode(0);
                                    }
                                }}>
                        {handwriteResult.length > 0? `Copy '${handwriteResult.at(0)}'`:"Click to handwrite"}</button>
                        <button className="hover:text-red-500 active:text-white active:bg-red-500 rounded-md w-5 h-5" style={{visibility:handwriteResult.length>0?"visible":"collapse"}} onClick={() => setHandwriteResults([])}>X</button>
                    </div>

                    <div className="flex flex-row">
                        <div className="flex flex-col cursor-pointer items-center">
                            <Image className={"h-8 w-8 rounded-lg" + (drawingMode==1?" bg-slate-200":"")} src={pen} alt="" onClick={() => {setDrawingMode(drawingMode==1 ? 0 : 1); setHandwriteMode(false);}}/>
                            <input id={`input-pencolor1-${documentData.id}`} className="h-4 w-10" type="color" value={drawingColor1} onChange={e => setDrawingColor1(e.target.value)} />
                        </div>
                        <div className="flex flex-col cursor-pointer items-center">
                            <Image className={"h-8 w-8 rounded-lg" + (drawingMode==2?" bg-slate-200":"")} src={pen} alt="" onClick={() => {setDrawingMode(drawingMode==2 ? 0 : 2); setHandwriteMode(false);}}/>
                            <input id={`input-pencolor2-${documentData.id}`} className="h-4 w-10" type="color" value={drawingColor2} onChange={e => setDrawingColor2(e.target.value)} />
                        </div>
                        <div className="flex flex-col cursor-pointer items-center">
                            <Image className={"h-8 w-8 rounded-lg" + (drawingMode==3?" bg-slate-200":"")} src={pen} alt="" onClick={() => {setDrawingMode(drawingMode==3 ? 0 : 3); setHandwriteMode(false);}}/>
                            <input id={`input-pencolor3-${documentData.id}`} className="h-4 w-10" type="color" value={drawingColor3} onChange={e => setDrawingColor3(e.target.value)} />
                        </div>
                    </div>
                </div>
                <div className={"w-full h-full" + (sidebarNumber==2?"":" hidden")}>
                    <div>
                        <input id={`input-docspell-${documentData.id}`} className="cursor-pointer" type="checkbox" checked={docmuentSpell} onChange={() => setDocumentSpell(!docmuentSpell)} />
                        <label htmlFor={`input-docspell-${documentData.id}`} className="cursor-pointer">Check Spell</label>
                    </div>
                    <div>
                        <input id={`input-docgrid-${documentData.id}`} className="cursor-pointer" type="checkbox" checked={docmuentGrid} onChange={() => setDocumentGrid(!docmuentGrid)} />
                        <label htmlFor={`input-docgrid-${documentData.id}`} className="cursor-pointer">Use Grid</label>
                    </div>
                </div>
            </div>
            <div className="grow h-full flex flex-col flex-auto items-center overflow-y-scroll overflow-x-hidden bg-slate-100 bluescroll relative"
                // For dragdrop system
                style={isDraggingBlock ? { cursor:"pointer" } : {}}
                onMouseUp={() => {setDraggingBlock(-1); setIsDraggingBlock(false)}}
                onMouseMove={event => {
                    var docview = document.getElementById("documentview-"+documentData.id);
                    var draggingBlock = document.getElementById("draggingblock-"+documentData.id);
                    if (docview == null || draggingBlock == null) return;
                    draggingBlock.style.left = `${event.clientX + 8}px`;
                    draggingBlock.style.top = event.clientY + "px"; // Plus 8 cause mr-2
                    
                    var blocks = Array.from(docview.getElementsByTagName("div")).filter(element => element.id.startsWith(`block-${documentData.id}`))
                    // console.log(blocks)
                    // TODO
                }}
            >
                
                <Canvas id={"canvas-handwrite-"+documentData.id} className={"absolute left-0 top-0 w-full h-full z-[100]"+(handwriteMode?"  bg-[#222222aa]":"")}
                        drawingMode={handwriteMode} drawingColor={"white"} drawingItems={handwriteItems} 
                        onDrawStart={ () => { handwriteTimeout.current != null && clearTimeout(handwriteTimeout.current); handwriteTimeout.current = null; }}
                        onDrawEnd={ () => {
                            function HandwriteRefresh(endWriting: boolean = true) {

                                var trace: number[][][] = handwriteItems.current.map(peice => {
                                    var X = peice.segments.map(segment => segment.x)
                                    var Y = peice.segments.map(segment => segment.y)
                                    return [X, Y];
                                });
                                
                                var options: HandwritingRecognizeOptions = {
                                    width: 1,
                                    height: 1,
                                    language: "ko",
                                    numOfWords: undefined,
                                    numOfReturn: 5
                                }
                                HandwritingRecognize(trace, options, results => {

                                    setHandwriteResults(results);
                                }, console.error);

                                if (endWriting){
                                    setHandwriteMode(false);
                                    handwriteItems.current = []
                                    var canvas = Array.from(document.getElementsByTagName("canvas")).filter(element => element.id == "canvas-handwrite-"+documentData.id).at(0)
                                    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
                                }
                            }

                            HandwriteRefresh(false);
                            handwriteTimeout.current != null && clearTimeout(handwriteTimeout.current);
                            handwriteTimeout.current = setTimeout(HandwriteRefresh, 2000)
                        }} />
                <p className={"absolute left-0 top-0 z-[110] text-white"+(handwriteMode?"":" hidden")}>Write down something...</p>


                <div id={"documentview-"+documentData.id} className={"relative flex flex-col bg-white grow" + (docmuentGrid? " editor-grid":"")} style={{width:"70%"}}>
                    <div id={"draggingblock-"+documentData.id}
                        className={"fixed text-gray-400"+(isDraggingBlock?"":" hidden")}
                        style={{left:0, top:0}}
                    />
                    <div id={"toolbar-"+documentData.id}
                        className={"fixed text-gray-400 bg-white border-2 rounded-lg z-[100] w-36 h-8 flex flex-row items-center"}
                        style={{left:0, top:0, visibility:toolbarMode?"visible":"hidden"}}
                    >
                        <button className="w-6 h-6 border-2 rounded-lg text-black hover:bg-slate-400 active:bg-slate-600">A</button>
                    </div>
                    <Canvas id={"canvas-draw-"+documentData.id} className="absolute top-0 w-full h-full" drawingMode={drawingMode != 0} drawingColor={drawingMode==3?drawingColor3:drawingMode==2?drawingColor2:drawingColor1} drawingItems={drawingItems} onDrawEnd={ () => documentData.draw.items = drawingItems.current }/> 
                    
                    {/* <hr key={"blockplace-"+documentData.id+"-0"} id={"blockplace-"+documentData.id+"-0"} className="border-y-2 border-cyan-400" style={(isDraggingBlock && draggingStick)?{}:{display : "none"}}></hr> */}
                    {docmuentBlocks.map((block, index) => (
                                        <div key={"blockholder-"+documentData.id+"-"+index}>
                                            <div key={"blocksidetool-"+documentData.id+"-"+index} className={"absolute right-full float-left flex items-start"+(!isDraggingBlock && (targettingBlock==index || targettingBlock==index+0.5)?"":" hidden")}
                                                onMouseEnter={() => setTargettingBlock(index+0.5)}
                                                onMouseLeave={() => (targettingBlock==index+0.5) && setTargettingBlock(-1)}>
                                                <button className="font-bold select-none px-1 rounded-l text-gray-400 hover:bg-gray-200 active:bg-gray-300"
                                                        onClick={() => {
                                                            setDocumentBlocks([...docmuentBlocks,new BlockData(BlockType.Text)]);
                                                            setDocumentFocus({index: docmuentBlocks.length, selection:FocusRange.zero()});
                                                        }}
                                                >+</button>
                                                <button className="font-bold select-none px-1 rounded-l text-gray-400 hover:bg-gray-200 active:bg-gray-300"
                                                        onMouseDown={() => {
                                                            var draggingBlock = document.getElementById("draggingblock-"+documentData.id);
                                                            if (draggingBlock) draggingBlock.innerHTML = document.getElementById("block-"+documentData.id+"-"+index)?.innerHTML ?? "";
                                                            setDraggingBlock(index);
                                                        }}
                                                        onMouseLeave={() => setIsDraggingBlock(isDraggingBlock || (draggingBlock != -1))}
                                                >::</button>
                                            </div>
                                            <Block
                                                key={"block-"+documentData.id+"-"+index}

                                                className={"m-0 bg-transparent"+(drawingMode?" select-none":"")}
                                                spellCheck={docmuentSpell}

                                                onMouseEnter={() => setTargettingBlock(index)}
                                                onMouseLeave={() => targettingBlock==index && setTargettingBlock(-1)}

                                                docid={documentData.id}
                                                index={index}
                                                blockData={block}
                                                focusData={docmuentFocus}
                                                fnAddBlock={fnAddBlock}
                                                fnSetFocus={setDocumentFocus}

                                                setMediaSelectorMode={setMediaSelectorMode}
                                                mediaSelectorCallback={mediaSelectorCallback}
                                            />
                                        </div>
                                ))}
                </div>
            </div>
        </div>
        <button onClick={() => console.log(documentData)}>Print</button>
    </div>
}
