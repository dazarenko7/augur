import React, { Component, useState, useEffect, useReducer } from 'react';
import classNames from 'classnames';

import { SecondaryButton, ExternalLinkButton } from 'modules/common/buttons';
import {
  TextInput,
  DatePicker,
  TimeSelector,
  TimezoneDropdown,
  FormDropdown,
  RadioBarGroup,
} from 'modules/common/form';
import { XIcon, AddIcon, HintAlternate } from 'modules/common/icons';
import ReactTooltip from 'react-tooltip';
import TooltipStyles from 'modules/common/tooltip.styles.less';
import Link from 'modules/create-market/containers/link';
import { Error } from 'modules/common/form';
import Styles from 'modules/create-market/components/common.styles.less';
import {
  FormattedNumber,
  DateFormattedObject,
  NewMarket,
  TimezoneDateObject,
} from 'modules/types';
import moment, { Moment } from 'moment';
import {
  CATEGORICAL,
  CATEGORICAL_OUTCOMES_MIN_NUM,
} from 'modules/common/constants';
import {
  buildformattedDate,
  convertUnixToFormattedDate,
} from 'utils/format-date';
import MarkdownRenderer from 'modules/common/markdown-renderer';
import {
  buildMarketDescription,
  tellIfEditableOutcomes,
  createTemplateOutcomes,
  substituteUserOutcome,
} from 'modules/create-market/get-template';
import {
  TemplateInput,
  TemplateInputType,
  Template,
  UserInputDateTime,
  CHOICE,
  REQUIRED,
} from '@augurproject/artifacts';
import {
  TemplateBannerText,
  SelectEventNoticeText,
} from 'modules/create-market/constants';
import {
  DismissableNotice,
  DISMISSABLE_NOTICE_BUTTON_TYPES,
} from 'modules/reporting/common';
import { NameValuePair } from 'modules/portfolio/types';
import { SquareDropdown } from 'modules/common/selection';

export interface HeaderProps {
  text: string;
  children?: Array<any>;
}

export const Header = (props: HeaderProps) => (
  <h2 className={Styles.Header}>
    {props.children ? props.children : props.text}
  </h2>
);

export const LargeHeader = (props: HeaderProps) => (
  <span className={Styles.LargeHeader}>
    {props.children ? props.children : props.text}
  </span>
);

export const MediumHeader = (props: HeaderProps) => (
  <span className={Styles.MediumHeader}>
    {props.children ? props.children : props.text}
  </span>
);

export interface SubheadersProps {
  header: string;
  subheader: string;
  link?: Boolean;
  href?: string;
  underline?: Boolean;
  ownLine?: Boolean;
  smallSubheader?: Boolean;
  renderMarkdown?: Boolean;
}

export interface DateTimeHeadersProps extends SubheadersProps {
  timezoneDateTime: string;
  timezone: string;
}

export const Subheaders = (props: SubheadersProps) => (
  <div className={Styles.Subheaders}>
    <h1>{props.header}</h1>
    <p>
      <span>{props.subheader}</span>
      {props.link && (
        <Link
          href={props.href}
          underline={props.underline}
          ownLine={props.ownLine}
        />
      )}
    </p>
  </div>
);

export interface XLargeSubheadersProps {
  header: string;
  subheader: string;
  children?: Array<any>;
}

export const XLargeSubheaders = (props: XLargeSubheadersProps) => (
  <div className={Styles.XLargeSubheaders}>
    <LargeHeader text={props.header} />
    <MediumHeader text={props.subheader}>{props.children}</MediumHeader>
  </div>
);

export interface HeaderLinkProps {
  text: string;
  href?: string;
  link?: Boolean;
  ownLine?: Boolean;
  underline?: Boolean;
  smallSubheader?: Boolean;
}

export const SmallHeaderLink = (props: HeaderLinkProps) => (
  <p
    className={classNames(Styles.SmallHeaderLink, {
      [Styles.XSmall]: props.smallSubheader,
    })}
  >
    <span>{props.text}</span>
    {props.link && (
      <Link
        href={props.href}
        underline={props.underline}
        ownLine={props.ownLine}
      />
    )}
  </p>
);

export const LargeSubheaders = (props: SubheadersProps) => (
  <div
    className={classNames(Styles.LargeSubheaders, {
      [Styles.Small]: props.smallSubheader,
    })}
  >
    <Header text={props.header} />
    <SmallHeaderLink
      text={props.subheader}
      href={props.href}
      underline={props.underline}
      ownLine={props.ownLine}
      link={props.link}
      smallSubheader={props.smallSubheader}
    />
  </div>
);

export const DateTimeHeaders = (props: DateTimeHeadersProps) => (
  <div className={Styles.SmallSubheaders}>
    <h1>{props.header}</h1>
    <span>{props.subheader}</span>
    {props.timezone && <span>{props.timezoneDateTime}</span>}
  </div>
);

export const SmallSubheaders = (props: SubheadersProps) => (
  <div className={Styles.SmallSubheaders}>
    <h1>{props.header}</h1>
    {props.renderMarkdown && <MarkdownRenderer text={props.subheader} />}
    {!props.renderMarkdown && <span>{props.subheader}</span>}
  </div>
);

export interface SubheadersTooltipProps {
  header: string | Element;
  subheader: string | Element;
  link?: Boolean;
  href?: string;
  underline?: Boolean;
  ownLine?: Boolean;
  smallSubheader?: Boolean;
  text: string;
  tooltipSubheader?: Boolean;
}

export const SmallSubheadersTooltip = (props: SubheadersTooltipProps) => (
  <div className={Styles.SmallSubheadersTooltip}>
    <h1>
      {props.header}
      {!props.tooltipSubheader && (
        <>
          <label
            className={TooltipStyles.TooltipHint}
            data-tip
            data-for={`tooltip-${props.header}`}
          >
            {HintAlternate}
          </label>
          <ReactTooltip
            id={`tooltip-${props.header}`}
            className={TooltipStyles.Tooltip}
            effect="solid"
            place="top"
            type="light"
            data-event="mouseover"
            data-event-off="blur scroll"
          >
            {props.text}
          </ReactTooltip>
        </>
      )}
    </h1>
    <span>
      {props.subheader}
      {props.tooltipSubheader && (
        <>
          <label
            className={TooltipStyles.TooltipHint}
            data-tip
            data-for={`tooltip-${props.header}`}
          >
            {HintAlternate}
          </label>
          <ReactTooltip
            id={`tooltip-${props.header}`}
            className={TooltipStyles.Tooltip}
            effect="solid"
            place="top"
            type="light"
            data-event="mouseover"
            data-event-off="blur scroll"
          >
            {props.text}
          </ReactTooltip>
        </>
      )}
    </span>
  </div>
);

export interface OutcomesListProps {
  outcomes: Array<string>;
}

export const OutcomesList = (props: OutcomesListProps) => (
  <div className={Styles.OutcomesList}>
    <h1>Outcomes</h1>
    <div>
      {props.outcomes.map((outcome: string, index: Number) => (
        <span key={String(index)}>
          {Number(index) + 1}. {outcome}
        </span>
      ))}
    </div>
  </div>
);

export interface ExplainerBlockProps {
  title: string;
  subtexts: string[];
  useBullets: boolean;
}

export const ExplainerBlock = (props: ExplainerBlockProps) => (
  <div className={Styles.ExplainerBlock}>
    <h2>{props.title}</h2>
    <ul
      className={classNames({
        [Styles.NotBulleted]: !props.useBullets,
      })}
    >
      {props.subtexts.map((subtext, index) => {
        return props.useBullets ? (
          <li key={index}>{subtext}</li>
        ) : (
          <p key={index}>{subtext}</p>
        );
      })}
    </ul>
  </div>
);

export interface ContentBlockProps {
  children: Array<any>;
  noDarkBackground?: Boolean;
  dark?: Boolean;
}

export const ContentBlock = (props: ContentBlockProps) => (
  <div
    className={classNames(Styles.ContentBlock, {
      [Styles.NoDark]: props.noDarkBackground,
      [Styles.Dark]: props.dark,
    })}
  >
    {props.children}
  </div>
);

export const LineBreak = () => <div className={Styles.LineBreak} />;

interface DateTimeSelectorProps {
  setEndTime?: number;
  onChange: Function;
  currentTimestamp: number;
  validations: object;
  hour: string;
  minute: string;
  meridiem: string;
  timezone: string;
  endTimeFormatted: TimezoneDateObject | DateFormattedObject;
  header?: string;
  subheader?: string;
  uniqueKey?: string;
  condensedStyle?: boolean;
}

interface TimeSelectorParams {
  hour?: string;
  minute?: string;
  meridiem?: string;
}

interface DatePickerSelectorProps {
  setEndTime?: number;
  onChange: Function;
  currentTimestamp: number;
  errrorMessage?: string;
  placeholder?: string;
  errorMessage?: string;
}

export const DatePickerSelector = (props: DatePickerSelectorProps) => {
  const {
    setEndTime,
    onChange,
    currentTimestamp,
    errorMessage,
    placeholder,
    condensedStyle,
  } = props;

  const [dateFocused, setDateFocused] = useState(false);

  return (
    <DatePicker
      date={setEndTime ? moment(setEndTime * 1000) : null}
      placeholder={placeholder}
      displayFormat="MMM D, YYYY"
      id="input-date"
      onDateChange={(date: Moment) => {
        if (!date) return onChange('setEndTime', '');
        onChange(date.startOf('day').unix());
      }}
      isOutsideRange={day =>
        day.isAfter(moment(currentTimestamp * 1000).add(6, 'M')) ||
        day.isBefore(moment(currentTimestamp * 1000))
      }
      numberOfMonths={1}
      onFocusChange={({ focused }) => {
        if (setEndTime === null) {
          onChange(currentTimestamp);
        }
        setDateFocused(() => focused);
      }}
      focused={dateFocused}
      errorMessage={errorMessage}
      condensedStyle={condensedStyle}
    />
  );
};

export const DateTimeSelector = (props: DateTimeSelectorProps) => {
  const {
    setEndTime,
    onChange,
    currentTimestamp,
    validations,
    hour,
    minute,
    meridiem,
    timezone,
    endTimeFormatted,
    header,
    subheader,
    uniqueKey,
    condensedStyle,
  } = props;

  const [dateFocused, setDateFocused] = useState(false);
  const [timeFocused, setTimeFocused] = useState(false);

  return (
    <div
      className={classNames(Styles.DateTimeSelector, {
        [Styles.Condensed]: condensedStyle,
      })}
      key={uniqueKey}
    >
      {!condensedStyle && (
        <Subheaders
          header={header ? header : 'Event Expiration date and time'}
          subheader={
            subheader
              ? subheader
              : 'Choose a date and time that is sufficiently after the end of the event. If event expiration before the event end time the market will likely be reported as invalid. Make sure to factor in potential delays that can impact the event end time. '
          }
          link
        />
      )}
      <span>
        <DatePicker
          date={setEndTime ? moment(setEndTime * 1000) : null}
          placeholder="Date"
          displayFormat="MMM D, YYYY"
          id="input-date"
          onDateChange={(date: Moment) => {
            if (!date) return onChange('setEndTime', '');
            onChange('setEndTime', date.startOf('day').unix());
          }}
          isOutsideRange={day =>
            day.isAfter(moment(currentTimestamp * 1000).add(6, 'M')) ||
            day.isBefore(moment(currentTimestamp * 1000))
          }
          numberOfMonths={1}
          onFocusChange={({ focused }) => {
            if (setEndTime === null) {
              onChange('setEndTime', currentTimestamp);
            }
            setDateFocused(() => focused);
          }}
          focused={dateFocused}
          errorMessage={validations && validations.setEndTime}
          condensedStyle={condensedStyle}
        />
        <TimeSelector
          hour={hour}
          minute={minute}
          meridiem={meridiem}
          onChange={(label: string, value: number) => {
            onChange(label, value);
          }}
          onFocusChange={(focused: Boolean) => {
            const timeSelector: TimeSelectorParams = {};
            if (!hour) {
              timeSelector.hour = '12';
            }
            if (!minute) {
              timeSelector.minute = '00';
            }
            if (!meridiem) {
              timeSelector.meridiem = 'AM';
            }

            onChange('timeSelector', timeSelector);
            setTimeFocused(() => focused);
          }}
          focused={timeFocused}
          errorMessage={validations && validations.hour}
          uniqueKey={uniqueKey}
          condensedStyle={condensedStyle}
        />
        <TimezoneDropdown
          onChange={(offsetName: string, offset: number, timezone: string) => {
            const timezoneParams = { offset, timezone, offsetName };
            onChange('timezoneDropdown', timezoneParams);
          }}
          timestamp={setEndTime}
          timezone={timezone}
          condensedStyle={condensedStyle}
        />
      </span>
      {!condensedStyle &&
        endTimeFormatted &&
        hour &&
        hour !== '' &&
        setEndTime && (
          <span>
            <div>
              <span>Converted to UTC-0:</span>
              <span>{endTimeFormatted.formattedUtc}</span>
            </div>
            <span>
              Augur uses the UTC-0 timezone to standarise times. Ensure the
              UTC-0 time is accurate and does not conflict with the resolution
              start time.
            </span>
          </span>
        )}
    </div>
  );
};

export interface NumberedInputProps {
  value: string;
  removable: boolean;
  number: number;
  placeholder: string;
  onChange: Function;
  onRemove?: Function;
  errorMessage?: string;
  editable?: boolean;
}

interface NumberedListOutcomes {
  value: string;
  editable: boolean;
}

export interface NumberedListProps {
  initialList: NumberedListOutcomes[];
  minShown: number;
  maxList: number;
  placeholder: string;
  updateList: Function;
  errorMessage?: string;
  hideAdd?: boolean;
  onRemoved?: Function;
}

export interface NumberedListState {
  list: NumberedListOutcomes[];
  isFull: boolean;
  isMin: boolean;
}

export const NumberedInput = ({
  number,
  value,
  placeholder,
  onChange,
  removable,
  onRemove,
  errorMessage,
  editable,
}: NumberedInputProps) => (
  <li key={number} className={Styles.NumberedInput}>
    <span>{`${number + 1}.`}</span>
    {editable && (
      <>
        <TextInput
          onChange={value => onChange(value, number)}
          value={value}
          placeholder={placeholder}
          errorMessage={errorMessage}
        />
        {removable && <button onClick={e => onRemove(number)}>{XIcon}</button>}
      </>
    )}
    {!editable && (
      <>
        {value}
        {errorMessage && errorMessage !== '' && errorMessage.length > 0 && (
          <span>{errorMessage}</span>
        )}
        {removable && <button onClick={e => onRemove(number)}>{XIcon}</button>}
      </>
    )}
  </li>
);

export class NumberedList extends Component<
  NumberedListProps,
  NumberedListState
> {
  state: NumberedListState = {
    list: this.props.initialList,
    isFull: this.props.initialList.length === this.props.maxList,
    isMin: this.props.initialList.length === this.props.minShown,
  };

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (
      JSON.stringify(this.props.initialList) !==
      JSON.stringify(nextProps.initialList)
    ) {
      this.setState({
        list: nextProps.initialList,
      });
    }
  }

  onChange = (value, index) => {
    const { updateList } = this.props;
    const { list } = this.state;
    list[index].value = value;
    this.setState({ list }, () => updateList(list.map(item => item.value)));
  };

  addItem = () => {
    const { isFull, list } = this.state;
    const { maxList, minShown, updateList } = this.props;
    if (!isFull) {
      list.push({ value: '', editable: true });
      this.setState(
        {
          list,
          isFull: list.length === maxList,
          isMin: list.length === minShown,
        },
        () => {
          updateList(list.map(item => item.value));
        }
      );
    }
  };

  removeItem = index => {
    const { isMin, list } = this.state;
    const { minShown, maxList, updateList, onRemoved } = this.props;
    if (!isMin) {
      list.splice(index, 1);
      this.setState(
        {
          list,
          isMin: list.length === minShown,
          isFull: list.length === maxList,
        },
        () => {
          updateList(list.map(item => item.value));
          //onRemoved && onRemoved(list[index].value);
        }
      );
    }
  };

  render() {
    const { list, isFull } = this.state;
    const { placeholder, minShown, errorMessage, hideAdd } = this.props;

    return (
      <ul className={Styles.NumberedList}>
        {list.map((item, index) => (
          <NumberedInput
            key={index}
            value={item.value}
            placeholder={placeholder}
            onChange={this.onChange}
            number={index}
            removable={index >= minShown}
            onRemove={this.removeItem}
            errorMessage={errorMessage && errorMessage[index]}
            editable={item.editable}
          />
        ))}
        {!hideAdd && (
          <li>
            <SecondaryButton
              disabled={isFull}
              text="Add"
              action={e => this.addItem()}
              icon={AddIcon}
            />
          </li>
        )}
      </ul>
    );
  }
}

export interface NoFundsErrorsProps {
  noEth: boolean;
  noRep: boolean;
  noDai: boolean;
  totalEth: FormattedNumber;
  totalRep: FormattedNumber;
  totalDai: FormattedNumber;
  availableEthFormatted: FormattedNumber;
  availableRepFormatted: FormattedNumber;
  availableDaiFormatted: FormattedNumber;
}
export const NoFundsErrors = (props: NoFundsErrorsProps) => {
  const {
    noEth,
    noRep,
    noDai,
    totalEth,
    totalRep,
    totalDai,
    availableEthFormatted,
    availableRepFormatted,
    availableDaiFormatted,
  } = props;

  return (
    <div className={classNames({ [Styles.HasError]: noEth || noDai || noRep })}>
      {noEth && (
        <Error
          alternate
          header="Not enough ETH in your wallet"
          subheader={`You have ${availableEthFormatted.formatted} ETH of ${totalEth.formatted} required to create this market`}
        />
      )}
      {noRep && (
        <Error
          alternate
          header="Not enough REP in your wallet"
          subheader={`You have ${availableRepFormatted.formatted} V2 REP of ${totalRep.formatted} required to create this market.`}
        />
      )}
      {noDai && (
        <Error
          alternate
          header="Not enough $ (DAI) in your wallet"
          subheader={`You have $${availableDaiFormatted.formatted} (DAI) of $${totalDai.formatted} (DAI) required to create this market`}
        />
      )}
    </div>
  );
};

interface InputFactoryProps {
  input: TemplateInput;
  inputIndex: number;
  onChange: Function;
  newMarket: NewMarket;
  currentTimestamp: number;
}

export const InputFactory = (props: InputFactoryProps) => {
  const { input, inputIndex, onChange, newMarket, currentTimestamp } = props;

  const { template, outcomes, marketType, validations } = newMarket;

  const { inputs } = template;

  const updateData = value => {
    let inputValidations = newMarket.validations.inputs;
    if (!inputValidations) {
      inputValidations = [];
    }
    inputValidations[inputIndex] = '';
    onChange('validations', {
      ...newMarket.validations,
      inputs: inputValidations,
    });

    let newInputs = inputs;
    newInputs[inputIndex].userInput = value;
    onChange('template', {
      ...template,
      inputs: newInputs,
    });

    const question = buildMarketDescription(template.question, newInputs);
    onChange('description', question);

    return newInputs;
  };

  if (input.type === TemplateInputType.TEXT) {
    return (
      <TextInput
        placeholder={input.placeholder}
        errorMessage={validations.inputs && validations.inputs[inputIndex]}
        onChange={value => {
          let newOutcomes = outcomes;
          const newInputs = updateData(value);
          if (marketType === CATEGORICAL && tellIfEditableOutcomes(newInputs)) {
            // this is done because we need to see if any other inputs, like SUBSTITUTE_USER_OUTCOME, rely on this input and then update them
            newOutcomes = createTemplateOutcomes(newInputs);
          }
          onChange('outcomes', newOutcomes);
        }}
        value={input.userInput}
      />
    );
  } else if (input.type === TemplateInputType.USER_DESCRIPTION_OUTCOME) {
    return (
      <TextInput
        placeholder={input.placeholder}
        errorMessage={validations.inputs && validations.inputs[inputIndex]}
        onChange={value => {
          let newOutcomes = outcomes;
          newOutcomes[inputIndex] = value;
          updateData(value);
          onChange('outcomes', newOutcomes);
        }}
        value={input.userInput}
      />
    );
  } else if (input.type === TemplateInputType.DATEYEAR) {
    return (
      <DatePickerSelector
        onChange={value => {
          input.setEndTime = value;
          const stringValue = convertUnixToFormattedDate(Number(value))
            .formattedSimpleData;
          updateData(stringValue);
        }}
        currentTimestamp={currentTimestamp}
        placeholder={input.placeholder}
        setEndTime={input.setEndTime}
        errorMessage={validations.inputs && validations.inputs[inputIndex]}
      />
    );
  } else if (
    input.type === TemplateInputType.DATETIME ||
    input.type === TemplateInputType.ESTDATETIME
  ) {
    return (
      <span>
        {input.userInput ? input.userInput : `[${input.placeholder}]`}
      </span>
    );
  } else if (
    input.type === TemplateInputType.DROPDOWN ||
    input.type === TemplateInputType.DENOMINATION_DROPDOWN ||
    input.type === TemplateInputType.USER_DESCRIPTION_DROPDOWN_OUTCOME
  ) {
    return (
      <FormDropdown
        options={input.values}
        defaultValue={input.userInput}
        staticLabel={input.placeholder}
        errorMessage={validations.inputs && validations.inputs[inputIndex]}
        onChange={value => {
          if (input.type === TemplateInputType.DENOMINATION_DROPDOWN) {
            onChange('scalarDenomination', value);
          } else if (
            input.type === TemplateInputType.USER_DESCRIPTION_DROPDOWN_OUTCOME
          ) {
            let newOutcomes = outcomes;
            newOutcomes[inputIndex] = value;
            onChange('outcomes', newOutcomes);
          }
          updateData(value);
        }}
      />
    );
  } else {
    return null;
  }
};

interface SimpleTimeSelectorProps {
  currentTime: number;
  onChange: Function;
}

export const SimpleTimeSelector = (props: EstimatedStartSelectorProps) => {
  const { currentTime, onChange } = props;

  const [endTime, setEndTime] = useState(null);
  const [hour, setHour] = useState(null);
  const [minute, setMinute] = useState(null);
  const [meridiem, setMeridiem] = useState('AM');
  const [timezone, setTimezone] = useState('');
  const [endTimeFormatted, setEndTimeFormatted] = useState('');
  const [offset, setOffset] = useState('');
  const [offsetName, setOffsetName] = useState('');
  useEffect(() => {
    const endTimeFormatted = buildformattedDate(
      Number(endTime),
      Number(hour),
      Number(minute),
      meridiem,
      offsetName,
      Number(offset)
    );
    setEndTimeFormatted(endTimeFormatted);
    onChange(endTimeFormatted);
  }, [endTime, hour, minute, meridiem, timezone, offset, offsetName]);

  return (
    <div>
      <DateTimeSelector
        setEndTime={endTime}
        condensedStyle
        onChange={(label, value) => {
          switch (label) {
            case 'timezoneDropdown':
              const { offset, timezone, offsetName } = value;
              setOffset(Number(offset));
              setTimezone(timezone);
              setOffsetName(offsetName);
              break;
            case 'setEndTime':
              setEndTime(value);
              break;
            case 'timeSelector':
              if (value.hour) setHour(value.hour);
              if (value.minute) setMinute(value.minute);
              if (value.meridiem) setMeridiem(value.meridiem);
              break;
            case 'minute':
              setMinute(value);
              break;
            case 'hour':
              setHour(value);
              break;
            case 'meridiem':
              setMeridiem(value);
              break;
            default:
              break;
          }
        }}
        hour={hour ? String(hour) : null}
        minute={minute ? String(minute) : null}
        meridiem={meridiem}
        timezone={timezone}
        currentTimestamp={currentTime}
        endTimeFormatted={endTimeFormatted}
        uniqueKey={'startTime'}
      />
    </div>
  );
};

interface EstimatedStartSelectorProps {
  newMarket: NewMarket;
  template: Template;
  input: TemplateInput;
  currentTime: number;
  onChange: Function;
  inputIndex: number;
}

export const EstimatedStartSelector = (props: EstimatedStartSelectorProps) => {
  const {
    newMarket,
    template,
    input,
    inputIndex,
    currentTime,
    onChange,
  } = props;

  const [endTime, setEndTime] = useState(
    input.userInput
      ? (input.userInputObject as UserInputDateTime).endTime
      : null
  );
  const [hour, setHour] = useState(
    input.userInput ? (input.userInputObject as UserInputDateTime).hour : null
  );
  const [minute, setMinute] = useState(
    input.userInput ? (input.userInputObject as UserInputDateTime).minute : null
  );
  const [meridiem, setMeridiem] = useState(
    input.userInput
      ? (input.userInputObject as UserInputDateTime).meridiem
      : 'AM'
  );
  const [timezone, setTimezone] = useState(
    input.userInput ? (input.userInputObject as UserInputDateTime).timezone : ''
  );
  const [endTimeFormatted, setEndTimeFormatted] = useState(
    input.userInput
      ? (input.userInputObject as UserInputDateTime).endTimeFormatted
      : ''
  );
  const [offset, setOffset] = useState(
    input.userInput ? (input.userInputObject as UserInputDateTime).offset : 0
  );
  const [offsetName, setOffsetName] = useState(
    input.userInput
      ? (input.userInputObject as UserInputDateTime).offsetName
      : ''
  );
  let userInput = input.placeholder;
  useEffect(() => {
    const endTimeFormatted = buildformattedDate(
      Number(endTime),
      Number(hour),
      Number(minute),
      meridiem,
      offsetName,
      Number(offset)
    );
    setEndTimeFormatted(endTimeFormatted);
    if (hour !== null && minute !== null) {
      if (input.type === TemplateInputType.DATETIME)
        userInput = endTimeFormatted.formattedUtc;
      else userInput = String(endTimeFormatted.timestamp);
    }
    template.inputs[props.input.id].userInputObject = {
      endTime,
      hour,
      minute,
      meridiem,
      timezone,
      offset,
      offsetName,
      endTimeFormatted,
    } as UserInputDateTime;
    if (hour !== null && minute !== null) {
      template.inputs[props.input.id].userInput = userInput;
    }
    let inputValidations = newMarket.validations.inputs;
    if (!inputValidations) {
      inputValidations = [];
    }
    inputValidations[inputIndex] = { setEndTime: '', hour: '' };
    // todo: need to see if they changed date or time and clear validations accordingly
    onChange('validations', {
      ...newMarket.validations,
      inputs: inputValidations,
    });
    const question = buildMarketDescription(template.question, template.inputs);

    onChange('description', question);
    onChange('template', template);
  }, [endTime, hour, minute, meridiem, timezone, offset, offsetName]);

  return (
    <div className={Styles.EstimatedStartSelector}>
      <DateTimeSelector
        header={props.input.label || 'Estimated start time'}
        subheader={
          props.input.sublabel || 'When is the event estimated to begin?'
        }
        setEndTime={endTime}
        onChange={(label, value) => {
          switch (label) {
            case 'timezoneDropdown':
              const { offset, timezone, offsetName } = value;
              setOffset(Number(offset));
              setTimezone(timezone);
              setOffsetName(offsetName);
              break;
            case 'setEndTime':
              setEndTime(value);
              break;
            case 'timeSelector':
              if (value.hour) setHour(value.hour);
              if (value.minute) setMinute(value.minute);
              if (value.meridiem) setMeridiem(value.meridiem);
              break;
            case 'minute':
              setMinute(value);
              break;
            case 'hour':
              setHour(value);
              break;
            case 'meridiem':
              setMeridiem(value);
              break;
            default:
              break;
          }
        }}
        validations={
          newMarket.validations.inputs &&
          newMarket.validations.inputs[inputIndex]
        }
        hour={hour ? String(hour) : null}
        minute={minute ? String(minute) : null}
        meridiem={meridiem}
        timezone={timezone}
        currentTimestamp={currentTime}
        endTimeFormatted={endTimeFormatted}
        uniqueKey={'templateEstTime'}
      />
    </div>
  );
};

export interface QuestionBuilderProps {
  newMarket: NewMarket;
  onChange: Function;
  currentTimestamp: number;
}

export const QuestionBuilder = (props: QuestionBuilderProps) => {
  const { onChange, newMarket, currentTimestamp } = props;
  const { template, outcomes, marketType, validations } = newMarket;
  const question = template.question.split(' ');
  const inputs = template.inputs;

  const dateTimeIndex = inputs.findIndex(
    input =>
      input.type === TemplateInputType.DATETIME ||
      input.type === TemplateInputType.ESTDATETIME
  );

  return (
    <div className={Styles.QuestionBuilder}>
      <Subheaders
        header="Market question"
        subheader="What do you want people to predict?"
      />
      <div>
        {question.map((word, index) => {
          const bracketPos = word.indexOf('[');
          const bracketPos2 = word.indexOf(']');

          if (bracketPos === -1 || bracketPos === -1) {
            return <span key={word + index}>{word}</span>;
          } else {
            const id = word.substring(bracketPos + 1, bracketPos2);
            const inputIndex = inputs.findIndex(
              findInput => findInput.id.toString() === id
            );
            if (inputIndex > -1) {
              const input = inputs[inputIndex];
              return (
                <InputFactory
                  key={inputIndex}
                  input={input}
                  inputIndex={inputIndex}
                  onChange={onChange}
                  newMarket={newMarket}
                  currentTimestamp={currentTimestamp}
                />
              );
            }
          }
        })}
      </div>
      <TemplateBanners categories={newMarket.categories} />
      {dateTimeIndex > -1 && (
        <EstimatedStartSelector
          newMarket={newMarket}
          onChange={onChange}
          input={inputs[dateTimeIndex]}
          currentTime={currentTimestamp}
          template={template}
          inputIndex={dateTimeIndex}
        />
      )}
      {marketType === CATEGORICAL && (
        <CategoricalTemplate newMarket={newMarket} onChange={onChange} />
      )}
    </div>
  );
};

export interface TemplateBannersProps {
  categories: string[];
}

export const TemplateBanners = (props: TemplateBannersProps) => {
  const text = props.categories.reduce(
    (p, c) =>
      Object.keys(TemplateBannerText).includes(c.toLowerCase())
        ? TemplateBannerText[c.toLowerCase()]
        : p,
    null
  );
  if (!text) return null;
  return (
    <DismissableNotice
      title={text}
      className={Styles.TopBannerMargin}
      buttonType={DISMISSABLE_NOTICE_BUTTON_TYPES.NONE}
      show
    />
  );
};

export interface CategoricalTemplateProps {
  newMarket: NewMarket;
  onChange: Function;
}

export const CategoricalTemplate = (props: CategoricalTemplateProps) => {
  const { newMarket } = props;
  const { template } = newMarket;
  const inputs = template.inputs;
  const hasDropdowns = inputs.find(
    i => i.type === TemplateInputType.USER_DESCRIPTION_DROPDOWN_OUTCOME_DEP
  );
  return hasDropdowns ? (
    <CategoricalTemplateDropdowns {...props} />
  ) : (
    <CategoricalTemplateTextInputs {...props} />
  );
};

export interface CategoricalTemplateTextInputsProps {
  newMarket: NewMarket;
  onChange: Function;
}

export const CategoricalTemplateTextInputs = (
  props: CategoricalTemplateTextInputsProps
) => {
  const { onChange, newMarket } = props;
  const { template, outcomes, validations } = newMarket;
  const inputs = template.inputs;

  let initialList = inputs
    .filter(
      input =>
        input.type === TemplateInputType.SUBSTITUTE_USER_OUTCOME ||
        input.type === TemplateInputType.ADDED_OUTCOME ||
        input.type === TemplateInputType.USER_DESCRIPTION_OUTCOME ||
        input.type === TemplateInputType.USER_DESCRIPTION_DROPDOWN_OUTCOME
    )
    .map(input => {
      if (input.type === TemplateInputType.SUBSTITUTE_USER_OUTCOME) {
        return {
          value: substituteUserOutcome(input, inputs),
          editable: false,
        };
      } else if (input.type === TemplateInputType.ADDED_OUTCOME) {
        return {
          value: input.placeholder,
          editable: false,
        };
      } else if (
        input.type === TemplateInputType.USER_DESCRIPTION_OUTCOME ||
        input.type === TemplateInputType.USER_DESCRIPTION_DROPDOWN_OUTCOME
      ) {
        return {
          value: input.userInput || input.placeholder,
          editable: false,
        };
      }
      return null;
    });

  outcomes.forEach(outcome => {
    if (initialList.filter(option => option.value === outcome).length === 0) {
      initialList.push({
        value: outcome,
        editable: true,
      });
    }
  });

  while (initialList.length < CATEGORICAL_OUTCOMES_MIN_NUM) {
    initialList.push({
      value: '',
      editable: true,
    });
  }

  const hideAdd = tellIfEditableOutcomes(inputs);

  return (
    <>
      <Subheaders
        header="Outcomes"
        subheader="List the outcomes people can choose from."
        link
      />
      <NumberedList
        initialList={initialList}
        minShown={2}
        maxList={7}
        placeholder={'Enter outcome'}
        updateList={(value: string[]) => {
          onChange('outcomes', value);
        }}
        hideAdd={hideAdd}
        errorMessage={validations.outcomes}
      />
    </>
  );
};

export interface CategoricalTemplateDropdownsProps {
  newMarket: NewMarket;
  onChange: Function;
}

interface CategoricalDropDownItem {
  value: string;
  editable: boolean;
}

interface CategoricalDropDownAction {
  type: string;
  data: CategoricalDropDownItem;
}
export const CategoricalTemplateDropdowns = (
  props: CategoricalTemplateDropdownsProps
) => {
  const MAX_ADDED_OUTCOMES = 7;
  const ACTIONS = {
    ADD: 'ADD',
    REMOVE: 'REMOVE',
    REMOVE_ALL: 'REMOVE_ALL',
    INIT_ADD: 'INIT_ADD'
  };
  const [outcomeList, dispatch] = useReducer(
    (state: CategoricalDropDownItem[], action: CategoricalDropDownAction) => {
      switch (action.type) {
        case ACTIONS.ADD:
          const newAddState = [...state, action.data];
          props.onChange('outcomes', newAddState.map(i => i.value));
          return newAddState;
        case ACTIONS.REMOVE:
          const newRemoveState = state.filter(s => s.value !== action.data.value)
          props.onChange('outcomes', newRemoveState.map(i => i.value));
          return newRemoveState;
        case ACTIONS.REMOVE_ALL:
          props.onChange('outcomes', []);
          return [];
        case ACTIONS.INIT_ADD:
          console.log("init add", [...state, action.data]);
          return [...state, action.data];
        default:
          return state;
      }
    },
    []
  );
  const [initialized, setInitialized] = useState(false);
  const [sourceUserInput, setSourceUserInput] = useState(undefined);
  const [depDropdownInput] = useState(
    props.newMarket.template.inputs.find(
      input =>
        input.type === TemplateInputType.USER_DESCRIPTION_DROPDOWN_OUTCOME_DEP
    )
  );
  const [defaultOutcomeItems] = useState(
    props.newMarket.template.inputs
      .filter(input => input.type === TemplateInputType.ADDED_OUTCOME)
      .map(input => ({
        value: input.placeholder,
        editable: false,
      }))
  );
  const [dropdownList, setdropdownList] = useState([]);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    const { template } = props.newMarket;
    const source = template.inputs.find(
      i => i.id === depDropdownInput.inputSourceId
    );

    setShowBanner(!!!source.userInput);

    // in case of re-hyration of market creation form need to set newMarket outcomes
    if (!initialized) {
      const { outcomes } = props.newMarket;
      setInitialized(true);
      outcomes.map((i: string) =>
        dispatch({
          type: ACTIONS.INIT_ADD,
          data: { value: i, editable: false },
        })
      );
      setSourceUserInput(source.userInput);
      setdropdownList(depDropdownInput.values[source.userInput]);
    } else {
      if (outcomeList.length == 0 && defaultOutcomeItems.length > 0) {
        defaultOutcomeItems.map((i: CategoricalDropDownItem) => dispatch({ type: ACTIONS.ADD, data: i }));
      }

      if (sourceUserInput !== source.userInput) {
        dispatch({ type: ACTIONS.REMOVE_ALL, data: null });
        setdropdownList(depDropdownInput.values[source.userInput]);
        setSourceUserInput(source.userInput);
      }
    }
  });

  const { newMarket } = props;
  const { validations } = newMarket;
  const min = defaultOutcomeItems.length;

  return (
    <>
      <Subheaders
        header="Outcomes"
        subheader="List the outcomes people can choose from."
        link
      />
      <NumberedList
        initialList={outcomeList}
        minShown={min}
        maxList={MAX_ADDED_OUTCOMES}
        placeholder={'Enter outcome'}
        updateList={() => {}}
        onRemoved={(value) =>
          dispatch({ type: ACTIONS.REMOVE, data: value })
        }
        hideAdd={true}
        errorMessage={validations.outcomes}
      />
      {showBanner && <SelectEventNotice text={SelectEventNoticeText} />}
      {!showBanner &&
        <OutcomeDropdownInput
          list={dropdownList}
          onAdd={(value) => dispatch({ type: ACTIONS.ADD, data: { value, editable: false }})}
          canAdd={outcomeList.length < MAX_ADDED_OUTCOMES}
        />
      }
    </>
  );
};

const OutcomeDropdownInput = ({ list, onAdd, canAdd }) => {
  const [newItem, setNewItem] = useState(null);
  const [resetValue, setResetValue] = useState(null);
  useEffect(() => {
    setResetValue(null);
  }, [list])
  return (
    <div className={Styles.OutcomeDropdownInput}>
      <FormDropdown
        id={'outcomeDropDown'}
        defaultValue={resetValue}
        staticLabel={'Select Value'}
        onChange={value => setNewItem(value)}
        options={list}
      />
      <SecondaryButton
        disabled={!canAdd || !newItem}
        text="Add"
        action={() => {
          onAdd(newItem);
          setResetValue('');
        }}
        icon={AddIcon}
      />
    </div>
  );
};

const SelectEventNotice = ({ text }) => (
  <DismissableNotice
    title={text}
    className={Styles.TopBannerMargin}
    buttonType={DISMISSABLE_NOTICE_BUTTON_TYPES.NONE}
    show
  />
);

export interface ResolutionRulesProps {
  newMarket: NewMarket;
  onChange: Function;
}

export const ResolutionRules = (props: ResolutionRulesProps) => {
  const { onChange, newMarket } = props;
  const { template } = newMarket;
  const { resolutionRules } = template;
  if (Object.keys(resolutionRules).length === 0) {
    return null;
  }
  return (
    <div className={Styles.ResolutionRules}>
      <Subheaders
        header="Added resolution rules"
        subheader="Rules for this template that will be included in your market."
      />
      {resolutionRules[CHOICE] && resolutionRules[CHOICE].length > 0 && (
        <>
          <span>Choose one:</span>
          <RadioBarGroup
            radioButtons={resolutionRules[CHOICE].map((rule, index) => {
              return {
                header: rule.text,
                value: index.toString(),
              };
            })}
            onChange={(value: string) => {
              const newResolutionRulesChoice = resolutionRules[CHOICE].map(
                (rule, index) => {
                  return {
                    ...rule,
                    isSelected: index.toString() === value,
                  };
                }
              );
              onChange('template', {
                ...template,
                resolutionRules: {
                  [REQUIRED]: resolutionRules[REQUIRED],
                  [CHOICE]: newResolutionRulesChoice,
                },
              });
            }}
          />
        </>
      )}
      {resolutionRules[REQUIRED] && resolutionRules[REQUIRED].length > 0 && (
        <>
          <span>Added Resolution details:</span>
          <div className={Styles.AddResolutionRules}>
            {resolutionRules[REQUIRED].map((rule, index) => (
              <div key={index}>{rule.text}</div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export interface InputHeadingProps {
  name: string;
  heading: string;
  subHeading: string;
  listItems: string[];
}

export const InputHeading = (props: InputHeadingProps) => (
  <div className={Styles.InputHeading}>
    <h1>{props.heading}</h1>
    <span>
      {props.subHeading}
      <ExternalLinkButton URL={'http://www.augur.net'} label={'Learn more'} />
    </span>
    <ul key={props.name}>
      {props.listItems.map((i, ndx) => (
        <li key={ndx}>{i}</li>
      ))}
    </ul>
  </div>
);
