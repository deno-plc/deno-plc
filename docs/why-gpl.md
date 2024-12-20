# Why GPL?

Most parts of @Deno-PLC are published under the terms of the GNU GPLv3 license.

If you have worked with PLCs, you might have experienced a situation where you had to replace something that was already installed and working just
because you were unable to modify its function. This is inefficient, possibly expensive, and harmful to the environment.

Contrary to popular belief, the GPL does not prohibit making money (you may still build software using Deno-PLC and sell it to a customer). Instead,
it enforces that any compiled form of software that is or contains GPL-licensed code must always be distributed together with its editable form (aka
source code). Additionally, version 3 explicitly requires that users must be able to deploy an altered version (the opposite is called
[tivoization](https://en.wikipedia.org/wiki/Tivoization)).

Together, this ensures that the user has the ability to alter the function of the PLC (which they paid money for or built themselves) on their own
behalf.

Please note that this represents my understanding and interpretation of the GPL. In case of doubt, read the GPL yourself and consult a lawyer. If the
GPL license text leaves it unclear whether a specific use case is permitted or not, the decision should consider the intention described in this
document.
