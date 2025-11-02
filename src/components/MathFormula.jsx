import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * 数学公式组件
 * 使用 KaTeX 渲染 LaTeX 数学公式
 * 
 * @param {Object} props
 * @param {string} props.formula - LaTeX 格式的数学公式
 * @param {boolean} props.block - 是否为块级公式（默认为行内公式）
 * @param {Object} props.style - 自定义样式
 */
const MathFormula = ({ formula, block = false, style = {} }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current && formula) {
      try {
        katex.render(formula, containerRef.current, {
          displayMode: block,
          throwOnError: false,
          strict: false,
          trust: false,
          output: 'html'
        });
      } catch (error) {
        console.error('KaTeX rendering error:', error);
        containerRef.current.textContent = formula; // 渲染失败时显示原始文本
      }
    }
  }, [formula, block]);

  return (
    <span
      ref={containerRef}
      className={block ? 'block my-2' : 'inline'}
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    />
  );
};

export default MathFormula;
