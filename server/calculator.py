"""Safe expression evaluator for curve calculator.

Uses Python's ast module to parse and evaluate mathematical expressions
with only allowed operations (arithmetic + math functions).
"""

import ast
import math
import operator

# Allowed binary operators
_BINOPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.Mod: operator.mod,
}

# Allowed unary operators
_UNARYOPS = {
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
}

# Allowed math functions
_FUNCTIONS = {
    "log": math.log,
    "log10": math.log10,
    "log2": math.log2,
    "sqrt": math.sqrt,
    "abs": abs,
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "exp": math.exp,
    "pow": math.pow,
    "min": min,
    "max": max,
}


def _eval_node(node: ast.AST, variables: dict[str, float]) -> float:
    """Recursively evaluate an AST node."""
    if isinstance(node, ast.Expression):
        return _eval_node(node.body, variables)
    elif isinstance(node, ast.Constant):
        if isinstance(node.value, (int, float)):
            return float(node.value)
        raise ValueError(f"不支持的常量类型: {type(node.value)}")
    elif isinstance(node, ast.Name):
        name = node.id
        if name in variables:
            return variables[name]
        if name in _FUNCTIONS:
            raise ValueError(f"'{name}' 是函数，需要加括号调用: {name}()")
        raise ValueError(f"未知变量: {name}")
    elif isinstance(node, ast.BinOp):
        op_type = type(node.op)
        if op_type not in _BINOPS:
            raise ValueError(f"不支持的运算符: {op_type.__name__}")
        left = _eval_node(node.left, variables)
        right = _eval_node(node.right, variables)
        return _BINOPS[op_type](left, right)
    elif isinstance(node, ast.UnaryOp):
        op_type = type(node.op)
        if op_type not in _UNARYOPS:
            raise ValueError(f"不支持的一元运算符: {op_type.__name__}")
        operand = _eval_node(node.operand, variables)
        return _UNARYOPS[op_type](operand)
    elif isinstance(node, ast.Call):
        if not isinstance(node.func, ast.Name):
            raise ValueError("只支持简单函数调用")
        func_name = node.func.id
        if func_name not in _FUNCTIONS:
            raise ValueError(f"不支持的函数: {func_name}")
        args = [_eval_node(arg, variables) for arg in node.args]
        return _FUNCTIONS[func_name](*args)
    else:
        raise ValueError(f"不支持的表达式节点: {type(node).__name__}")


def safe_eval(expression: str, variables: dict[str, float]) -> float:
    """Safely evaluate a mathematical expression with given variables.

    Only arithmetic operators and whitelisted math functions are allowed.
    """
    try:
        tree = ast.parse(expression, mode="eval")
    except SyntaxError as e:
        raise ValueError(f"表达式语法错误: {e}")
    return _eval_node(tree, variables)


def evaluate_expression(
    expression: str,
    curve_data: dict[str, list[tuple[float, float | None]]],
) -> list[tuple[float, float | None]]:
    """Evaluate expression across all depths.

    curve_data: {curve_name: [(depth, value), ...]}
    Returns: [(depth, value), ...] for the result curve.
    """
    # Collect all depths
    all_depths: set[float] = set()
    for points in curve_data.values():
        for depth, _ in points:
            all_depths.add(depth)

    # Build depth-indexed lookup
    depth_lookup: dict[str, dict[float, float | None]] = {}
    for cname, points in curve_data.items():
        depth_lookup[cname] = {d: v for d, v in points}

    result = []
    for depth in sorted(all_depths):
        variables = {}
        has_none = False
        for cname in curve_data:
            val = depth_lookup[cname].get(depth)
            if val is None:
                has_none = True
                break
            variables[cname] = val

        if has_none:
            result.append((depth, None))
        else:
            try:
                val = safe_eval(expression, variables)
                result.append((depth, val))
            except (ValueError, ZeroDivisionError, OverflowError):
                result.append((depth, None))

    return result
