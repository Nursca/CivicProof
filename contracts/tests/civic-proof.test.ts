import { describe, expect, it } from "vitest";
import { Cl, cvToValue } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const alice = accounts.get("wallet_1")!;
const bob = accounts.get("wallet_2")!;
const carol = accounts.get("wallet_3")!;

const C = "civic-proof";

function report(sender = alice, category = 1) {
  return simnet.callPublicFn(
    C,
    "report-issue",
    [
      Cl.stringUtf8("Streetlight out on Elm St"),
      Cl.stringUtf8("The lamp at the corner has been dark for a week."),
      Cl.stringUtf8("Elm St & 4th Ave"),
      Cl.uint(category),
    ],
    sender,
  );
}

function getIssue(id: number) {
  const { result } = simnet.callReadOnlyFn(C, "get-issue", [Cl.uint(id)], deployer);
  return cvToValue(result).value.value;
}

describe("reporting", () => {
  it("creates an open issue with sequential ids", () => {
    expect(report().result).toBeOk(Cl.uint(1));
    expect(report(bob, 4).result).toBeOk(Cl.uint(2));
    const issue = getIssue(1);
    expect(issue.reporter.value).toBe(alice);
    expect(issue.status.value).toBe("0");
    expect(issue["update-count"].value).toBe("1");
    expect(simnet.callReadOnlyFn(C, "get-issue-count", [], deployer).result).toBeOk(Cl.uint(2));
  });

  it("rejects invalid category, empty title and empty location", () => {
    expect(report(alice, 0).result).toBeErr(Cl.uint(400));
    expect(report(alice, 6).result).toBeErr(Cl.uint(400));
    const empty = (title: string, loc: string) =>
      simnet.callPublicFn(
        C,
        "report-issue",
        [Cl.stringUtf8(title), Cl.stringUtf8(""), Cl.stringUtf8(loc), Cl.uint(1)],
        alice,
      ).result;
    expect(empty("", "x")).toBeErr(Cl.uint(402));
    expect(empty("x", "")).toBeErr(Cl.uint(403));
  });

  it("returns none for unknown issues", () => {
    expect(simnet.callReadOnlyFn(C, "get-issue", [Cl.uint(99)], deployer).result).toBeOk(Cl.none());
  });
});

describe("confirmations", () => {
  it("lets others confirm once, not the reporter", () => {
    report();
    expect(simnet.callPublicFn(C, "confirm-issue", [Cl.uint(1)], alice).result).toBeErr(Cl.uint(411));
    expect(simnet.callPublicFn(C, "confirm-issue", [Cl.uint(1)], bob).result).toBeOk(Cl.uint(1));
    expect(simnet.callPublicFn(C, "confirm-issue", [Cl.uint(1)], bob).result).toBeErr(Cl.uint(410));
    expect(simnet.callPublicFn(C, "confirm-issue", [Cl.uint(1)], carol).result).toBeOk(Cl.uint(2));
    expect(
      simnet.callReadOnlyFn(C, "has-confirmed", [Cl.uint(1), Cl.principal(bob)], deployer).result,
    ).toBeOk(Cl.bool(true));
    expect(simnet.callPublicFn(C, "confirm-issue", [Cl.uint(9)], bob).result).toBeErr(Cl.uint(404));
  });
});

describe("status lifecycle", () => {
  const note = Cl.stringUtf8("Crew scheduled");

  it("only stewards can acknowledge", () => {
    report();
    expect(simnet.callPublicFn(C, "acknowledge-issue", [Cl.uint(1), note], alice).result).toBeErr(
      Cl.uint(401),
    );
    expect(simnet.callPublicFn(C, "acknowledge-issue", [Cl.uint(1), note], deployer).result).toBeOk(
      Cl.uint(1),
    );
    // can't acknowledge twice
    expect(simnet.callPublicFn(C, "acknowledge-issue", [Cl.uint(1), note], deployer).result).toBeErr(
      Cl.uint(409),
    );
  });

  it("reporter or steward can resolve; others cannot", () => {
    report();
    expect(simnet.callPublicFn(C, "resolve-issue", [Cl.uint(1), note], bob).result).toBeErr(Cl.uint(401));
    expect(simnet.callPublicFn(C, "resolve-issue", [Cl.uint(1), note], alice).result).toBeOk(Cl.uint(2));
    expect(simnet.callPublicFn(C, "resolve-issue", [Cl.uint(1), note], alice).result).toBeErr(Cl.uint(409));
    // acknowledging a resolved issue is invalid
    expect(simnet.callPublicFn(C, "acknowledge-issue", [Cl.uint(1), note], deployer).result).toBeErr(
      Cl.uint(409),
    );
  });

  it("resolved issues can be reopened", () => {
    report();
    expect(simnet.callPublicFn(C, "reopen-issue", [Cl.uint(1), note], alice).result).toBeErr(Cl.uint(409));
    simnet.callPublicFn(C, "resolve-issue", [Cl.uint(1), note], deployer);
    expect(simnet.callPublicFn(C, "reopen-issue", [Cl.uint(1), note], bob).result).toBeErr(Cl.uint(401));
    expect(simnet.callPublicFn(C, "reopen-issue", [Cl.uint(1), note], alice).result).toBeOk(Cl.uint(0));
  });

  it("records an append-only history with actors", () => {
    report();
    simnet.callPublicFn(C, "acknowledge-issue", [Cl.uint(1), Cl.stringUtf8("Seen")], deployer);
    simnet.callPublicFn(C, "resolve-issue", [Cl.uint(1), Cl.stringUtf8("Fixed")], alice);
    const { result } = simnet.callReadOnlyFn(C, "get-issue-history", [Cl.uint(1)], deployer);
    const history = cvToValue(result).value;
    expect(history).toHaveLength(3);
    expect(history.map((h: any) => h.value.status.value)).toEqual(["0", "1", "2"]);
    expect(history[1].value.actor.value).toBe(deployer);
    expect(history[2].value.actor.value).toBe(alice);
    expect(history[2].value.note.value).toBe("Fixed");
  });

  it("caps history at 20 entries", () => {
    report();
    // 1 initial + 19 more = 20
    for (let i = 0; i < 19; i++) {
      const fn = i % 2 === 0 ? "resolve-issue" : "reopen-issue";
      expect(simnet.callPublicFn(C, fn, [Cl.uint(1), note], alice).result).toBeOk(
        Cl.uint(i % 2 === 0 ? 2 : 0),
      );
    }
    // now resolved with 20 entries; reopen should fail
    expect(simnet.callPublicFn(C, "reopen-issue", [Cl.uint(1), note], alice).result).toBeErr(Cl.uint(412));
  });
});

describe("stewards", () => {
  it("owner can add and remove stewards", () => {
    report();
    expect(
      simnet.callPublicFn(C, "set-steward", [Cl.principal(bob), Cl.bool(true)], alice).result,
    ).toBeErr(Cl.uint(401));
    expect(
      simnet.callPublicFn(C, "set-steward", [Cl.principal(bob), Cl.bool(true)], deployer).result,
    ).toBeOk(Cl.bool(true));
    expect(simnet.callReadOnlyFn(C, "is-steward", [Cl.principal(bob)], deployer).result).toBeOk(
      Cl.bool(true),
    );
    expect(
      simnet.callPublicFn(C, "acknowledge-issue", [Cl.uint(1), Cl.stringUtf8("ok")], bob).result,
    ).toBeOk(Cl.uint(1));
    simnet.callPublicFn(C, "set-steward", [Cl.principal(bob), Cl.bool(false)], deployer);
    expect(simnet.callReadOnlyFn(C, "is-steward", [Cl.principal(bob)], deployer).result).toBeOk(
      Cl.bool(false),
    );
  });
});

describe("pagination", () => {
  it("returns up to 20 issues from a start id", () => {
    for (let i = 0; i < 23; i++) report();
    const page1 = cvToValue(
      simnet.callReadOnlyFn(C, "get-issues-page", [Cl.uint(1)], deployer).result,
    ).value;
    expect(page1).toHaveLength(20);
    expect(page1[0].value.id.value).toBe("1");
    const page2 = cvToValue(
      simnet.callReadOnlyFn(C, "get-issues-page", [Cl.uint(21)], deployer).result,
    ).value;
    expect(page2).toHaveLength(3);
    expect(page2[2].value.id.value).toBe("23");
  });
});
