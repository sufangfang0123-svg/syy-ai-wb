# Third-Party Notices

本项目包含以下经改造的开源组件。未列出的参考项目仅用于研究，没有复制其源代码。

## Magic UI — Number Ticker

- Upstream: https://github.com/magicuidesign/magicui
- Commit: `5543371f99eaa6d1549a8dec864e78ee0b4515f2`
- Source: `apps/www/registry/magicui/number-ticker.tsx`
- Local adaptation: `src/components/magicui/number-ticker.tsx`
- Changes: 中文数字格式；添加 `prefers-reduced-motion` 即时完成路径；适配本项目代码风格。
- License: MIT
- Copyright: Copyright (c) Magic UI

## Magic UI — Orbiting Circles

- Upstream: https://github.com/magicuidesign/magicui
- Commit: `5543371f99eaa6d1549a8dec864e78ee0b4515f2`
- Source: `apps/www/registry/magicui/orbiting-circles.tsx`
- Local adaptation: `src/components/magicui/orbiting-circles.tsx`
- Changes: 使用项目 CSS token；添加可解释标签；全局 reduced-motion 降级；移除与项目无关的选项。
- License: MIT
- Copyright: Copyright (c) Magic UI

## shadcn/ui lineage

项目既有 `src/components/ui/sheet.tsx` 延续 shadcn/ui + Radix Primitives 的本地组件模式。本轮只复用该本地组件，没有重新复制上游文件。

- Upstream reviewed: https://github.com/shadcn-ui/ui
- Commit reviewed: `6261bd89f72d794aea491482cc2acfd8dc3d63e2`
- Reference: `apps/v4/registry/new-york-v4/ui/sheet.tsx`
- License: MIT
- Copyright: Copyright (c) 2023 shadcn

## MIT License Text

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
