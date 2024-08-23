"use client";

import { applyStyle, StyledTextData, StyledTextStyle } from "@/shared/components/StyledText";

// import { useState } from "react";


export default function Test() {
    var d1 = applyStyle(2, 8, StyledTextStyle.create({fg:"red"}), ["abc", "def", "ghi", "jkl", "mno", "pqr"].map(s => (new StyledTextData(s))));
    var d2 = applyStyle(1, 3, StyledTextStyle.create({bg:"blue"}), d1);
    console.log(d1, d2);
    // var [toggle, setToggle] = useState(false);
    return <main className='h-screen flex flex-col'>
        {/* <Toggle defaultChecked={toggle} onToggle={() => setToggle(!toggle)} /> */}
    </main>;
}