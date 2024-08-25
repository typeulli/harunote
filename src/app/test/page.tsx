"use client";

import StyledText, { applyStyle, StyledTextData, StyledTextStyle, writeAt } from "@/shared/components/StyledText";
import { useState } from "react";

// import { useState } from "react";

// function TextUtilTest() {
//     var [text, setText] = useState([new StyledTextData("abcdefghijklmnopar")]);
//     var [command, setCommand] = useState("");
//     var [data, setData] = useState("");
//     return <div>
//         <StyledText stdataList={text}/>
//         <input value={command} onChange={e=>setCommand(e.target.value)} />
//         <input value={data} onChange={e=>setData(e.target.value)} />
//         <button onClick={setText(applyStyle())} children="RUN"/>
//     </div>
// }

export default function Test() {
    var d1 = applyStyle(2, 8, StyledTextStyle.create({fg:"red"}), ["abc", "def", "ghi", "jkl", "mno", "pqr"].map(s => (new StyledTextData(s))));
    var d2 = applyStyle(1, 3, StyledTextStyle.create({fg:"blue"}), d1);
    var d3 = writeAt(d2, 4, "asdf");
    console.log(d1, d2, d3);
    var d4 = applyStyle(2, 5, StyledTextStyle.create({fg:"red"}), [new StyledTextData("abcdefghijklmnopar")]);
    console.log(d4);



    // var [toggle, setToggle] = useState(false);
    return <main className='h-screen flex flex-col'>
        {/* <Toggle defaultChecked={toggle} onToggle={() => setToggle(!toggle)} /> */}
    </main>;
}