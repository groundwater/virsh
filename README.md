# VIR Shell

> An experiment, slow, everything might change, never use this

## Try It

```
npx virsh
```

## Goals

1. Scriptable and Bash-like for simple executions
2. Composable
3. Interoperable with JavaScript Promises
4. Optimized for small programs

## TODOs

1. Error handling is terrible. Good luck. It's a combination of uncacught parser-errors, and my own errors thrown with very little context.
2. The grammar is overly-permissive. Some allowable stuff might be disallowed in future.
3. I want to add automatic semicolon insertion (ASI) as a pre-processing step.
4. Add currying, and auto-invocation e.g. `ls = func { 12 }; ls #12`

## Simple Expressions

### Numbers

```
10
12.0
```
### Strings

```
"Hello"
'Hello'
```
### Boolean

```
true
false
```
### Lists

Lists are created implicly whenever a comma is used to separate values:

```
1, 2, 3
```

To create a 1-item list, use a trailing comma in parentheses `(1,)`.

Grab a single item with `[...]` e.g.

```
l = 1, 2, 3;
l[0] == 1
```

### Objects/Maps/Dicts

```
{
    name: "Foo",
    age: 19
}
```

## Assignments

You do not need to declare variables.
You just use them.

```
x = 10
y = "Hello"
```

## Templates

Templates can use values from the current scope:

    ```
    name = "Amber"
    "Hello {name}"
    ```

## Functions

Currently, you cannot define functions.
You can call functions injected into your scope.

1. Call with a single arg.

    ```
    $ range 10
    [1, 2, 3, ..., 10]
    ```
2. You cannot invoke a function with zero args.
   You should instead return a calculated value.
3. Multiple args

    ```
    $ range 10 11
    [10, 11]
    ```
## Generators



## Iterations

For loops are not first-class constructs. They're just an remix of two primitives:

1. function evaluation
2. lazy/unbound function arguments

```
for i <- 1..10 {
    i
}
```

The `{ i }` block is not bound, nor evaluated when it's passed as an argument to `for`.
The invoked function is responsible for both binding the block to a `Scope`, and evaluating the body.

## Conditionals

Lazy evaluation gives you branching without special constructs or callbacks.
If statements will evaluate one, or another arguments depending on the conditional.

- Everything looks normal

    ```
    cond = true

    if cond {
        "True"
    } else {
        "False"
    }
    ```
- You can omit the `else` block:

    ```
    cond = true

    if cond {
        "True"
    } {
        "False"
    }
    ```
- You can omit the brackets too:

    ```
    cond = true

    if cond "True" "False"
    ```

## User Defined Functions

Define user-defined functions with `func`

```
z = 1
y = func { x + z }
```

Call them with

```
y {x:2}
# 3
```

Under the hood, this is also a "hack". The defined function body is unbound and unevalated when the function is created.
The body is evaluated when invoked later, but with a new scope.

The new scope is of a mix of the lexical scope when defined, and the dynamic scope when invoked.
Calling `y {x:1}` causes any lexically bound `x` values to be shadowed by the dynamically bound `x` at call time.
Since `z` is not shadowed, it resolves to `1`.

## Horrors

- `with` statements

    ```
    sc = {name: 'jay'};
    with sc {
        name
    }
    ```
